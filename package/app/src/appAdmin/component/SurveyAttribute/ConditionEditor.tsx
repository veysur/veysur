import { useState, useMemo, useEffect } from 'react'
import { sortLanguageCodesByName } from 'veysur-common'
import {
  CheckCircle2,
  AlertCircle,
  Code2,
  GitBranch,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Blocks,
  User,
  MessageSquare,
  ListChecks,
} from 'lucide-react'
import {
  ConditionValidator,
  ConditionTreeParser,
  QuestionInfo,
  buildQuestionInfoBase,
  buildAnswerOptionsForQuestion,
  getChoiceOtherValue,
  buildQuestionVariableEntries,
  buildParticipantVariableEntries,
  buildResponseVariableEntries,
  RESPONSE_FIELD_METADATA,
} from 'veysur-common'

import { Label } from 'component/shadcn/label'
import { Button } from 'component/shadcn/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'component/shadcn/dialog'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'component/shadcn/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'component/shadcn/tabs'

import { useSurveyParticipantAttributeList } from 'appAdmin/component/SurveyParticipant'

import { CodeEditorJs } from '../CodeEditor'
import { AttributeConfig } from '../SurveyAttributesPanel/attributesConfig'
import { useSurveyEditorStore } from '../SurveyEditor'
import { useQuestionPositionAvailability } from '../SurveyEditor/hook/useQuestionPositionAvailability'
import { ConditionBuilder } from './ConditionBuilder'
import { VariablePicker } from '../VariablePicker/VariablePicker'

type EditorMode = 'builder' | 'code'

type ConditionEditorProps = Omit<
  Parameters<AttributeConfig['component']>[0],
  'onChange'
> & {
  onChange: (value: string | null) => void | Promise<void>
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const ConditionEditor: React.FC<ConditionEditorProps> = function ({
  config,
  value,
  onChange,
  entity,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
}) {
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = isControlled ? (controlledOpen ?? false) : internalOpen
  const [localValue, setLocalValue] = useState(value || '')
  const [localErrors, setLocalErrors] = useState<string[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('builder')
  const survey = useSurveyEditorStore((state) => state.survey)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)

  const { systemAttributes, customAttributes } =
    useSurveyParticipantAttributeList(survey?._id || '')

  // Dynamic list of this survey's participant variable names (system + custom),
  // including internal ones (e.g. token) - internal only means "hidden from the
  // public registration form", not "unusable in conditions"
  const participantAttributes = useMemo(
    () =>
      [...systemAttributes, ...customAttributes].map((attr) => ({
        name: attr.name,
        label: attr.label,
      })),
    [systemAttributes, customAttributes],
  )

  const participantVariableNames = useMemo(
    () => new Set(participantAttributes.map((attr) => attr.name)),
    [participantAttributes],
  )

  // Fixed, system-defined list - not survey-specific, so no useMemo dependency
  const responseFields = useMemo(
    () =>
      Object.entries(RESPONSE_FIELD_METADATA).map(([name, meta]) => ({
        name,
        label: meta.label,
      })),
    [],
  )

  const languages = useMemo(() => {
    const langDefault = survey?.language?.default || 'en'
    return sortLanguageCodesByName(
      Array.from(new Set([langDefault, ...(survey?.language?.options || [])])),
    )
  }, [survey?.language?.default, survey?.language?.options])

  // Build questionsInfo from survey - needed for both validation and builder editor
  const questionsInfo = useMemo((): QuestionInfo[] => {
    if (!survey) return []
    const lang = langEditing || langDefault || 'en'
    return survey.elements.questionList().map((question, index) => ({
      ...buildQuestionInfoBase(question, index),
      text: question.text?.getLang(lang, langDefault || 'en'),
      choiceFormat: question.attributes?.choiceFormat,
      answerOptions: buildAnswerOptionsForQuestion(question, (ao) =>
        ao.label?.getLang(lang, langDefault || 'en'),
      ),
      choiceOtherValue: getChoiceOtherValue(question),
      subquestions: question.subquestions?.map((sq) => ({
        code: sq.code,
        text: sq.text?.getLang(lang, langDefault || 'en'),
        type: sq.type,
      })),
    }))
  }, [survey, langEditing, langDefault])

  // Position of the entity this condition belongs to, used both to scope
  // which questions are available for reference and to live-validate the
  // saved condition against the survey's *current* structure (which may have
  // changed since this condition was last saved). Shared with
  // `useTextExpressionVariablePicker` via `useQuestionPositionAvailability` -
  // this is only ever invoked with a question or group entity (wired from
  // `QuestionView`/`QuestionGroupView`), never `'end'`.
  const { currentPosition, availableQuestions } =
    useQuestionPositionAvailability(survey, entity, questionsInfo)

  // Variables available for the code editor's insertion picker - same
  // forward-reference-scoped question set used for validation, plus this
  // survey's participant variables.
  const variablePickerGroups = useMemo(
    () => [
      {
        label: 'Participant',
        icon: User,
        entries: buildParticipantVariableEntries(participantAttributes),
      },
      {
        label: 'Response',
        icon: MessageSquare,
        entries: buildResponseVariableEntries(responseFields),
      },
      {
        label: 'Questions',
        icon: ListChecks,
        entries: buildQuestionVariableEntries(availableQuestions),
      },
    ],
    [participantAttributes, responseFields, availableQuestions],
  )

  // Live validity of the *saved* condition (the `value` prop) against the
  // survey's current structure. Recomputed on every render where the survey
  // or this entity's position changes, so it reflects edits made elsewhere
  // since this condition was last saved - unlike the `errors` prop, which
  // only reflects the last schema/patch validation pass.
  const liveValidation = useMemo(() => {
    if (!value || value.trim() === '' || !survey || !entity) {
      return { isValid: true, errors: [] as string[] }
    }
    return ConditionValidator.validate(
      value,
      questionsInfo,
      currentPosition,
      participantVariableNames,
    )
  }, [
    value,
    survey,
    entity,
    questionsInfo,
    currentPosition,
    participantVariableNames,
  ])

  // Determine initial editor mode when dialog opens
  const determineInitialMode = (conditionValue: string): EditorMode => {
    if (!conditionValue || conditionValue.trim() === '') {
      return 'builder'
    }
    // Try to parse - if it fails, use code mode
    const parsed = ConditionTreeParser.parse(
      conditionValue,
      undefined,
      participantVariableNames,
    )
    return parsed ? 'builder' : 'code'
  }

  // Sync local state when the controlled dialog opens
  useEffect(() => {
    if (isControlled && controlledOpen) {
      setLocalValue(value || '')
      setLocalErrors(null)
      setShowHelp(false)
      setEditorMode(determineInitialMode(value || ''))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledOpen])

  const setIsOpen = (open: boolean) => {
    if (!isControlled) setInternalOpen(open)
    onControlledOpenChange?.(open)
  }

  const validateCondition = (
    conditionValue: string | null,
  ): { isValid: boolean; errors: string[] } => {
    if (!conditionValue || conditionValue.trim() === '' || !survey || !entity) {
      return { isValid: true, errors: [] }
    }

    const result = ConditionValidator.validate(
      conditionValue,
      questionsInfo,
      currentPosition,
      participantVariableNames,
    )

    return { isValid: result.isValid, errors: result.errors }
  }

  // Live validation of the value currently being edited (Code mode or
  // Builder mode), recomputed on every keystroke so problems - unknown
  // codes, forward references, bad syntax - surface immediately rather than
  // only after clicking Save.
  const liveEditingValidation = useMemo(
    () => validateCondition(localValue || null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      localValue,
      survey,
      entity,
      questionsInfo,
      currentPosition,
      participantVariableNames,
    ],
  )

  const handleSave = async () => {
    setIsSaving(true)
    setLocalErrors(null)

    // Validate locally first
    const validation = validateCondition(localValue || null)
    if (!validation.isValid) {
      setLocalErrors(validation.errors)
      setIsSaving(false)
      return
    }

    try {
      await onChange(localValue || null)
      setIsOpen(false)
      setLocalErrors(null)
    } catch {
      setLocalErrors(['An error occurred while saving'])
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    setLocalValue('')
    setLocalErrors(null)
    await onChange(null)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setLocalValue(value || '')
    setLocalErrors(null)
    setIsOpen(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalValue(value || '')
      setLocalErrors(null)
      setShowHelp(false)
      setEditorMode(determineInitialMode(value || ''))
    }
    setIsOpen(open)
  }

  const handleModeChange = (mode: string) => {
    if (mode === 'builder') {
      // Try to parse current code into builder editor
      const parsed = ConditionTreeParser.parse(
        localValue,
        undefined,
        participantVariableNames,
      )
      if (!parsed && localValue.trim()) {
        // Can't parse - stay in code mode
        return
      }
    }
    setEditorMode(mode as EditorMode)
  }

  const hasCondition = !!value && value.trim() !== ''
  const conditionErrors = liveValidation.errors
  const hasErrors = !liveValidation.isValid

  // Errors shown inside the open editor: a save-attempt error (e.g. the
  // network request failed) takes priority; otherwise fall back to the live
  // validation of whatever is currently being edited, so problems are
  // visible as soon as they're introduced rather than only after Save fails.
  const displayErrors =
    localErrors ??
    (localValue.trim() !== '' && !liveEditingValidation.isValid
      ? liveEditingValidation.errors
      : [])

  const dialog = (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 w-full"
          >
            <GitBranch className="h-4 w-4" />
            {hasCondition ? 'Edit' : 'Add'}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch />
            Display Condition
          </DialogTitle>
          <DialogDescription>
            Define when this element should be shown. Use the builder or write
            JavaScript code directly.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2.5">
          <Tabs value={editorMode} onValueChange={handleModeChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builder" className="flex items-center gap-2">
                <Blocks className="h-4 w-4" />
                Builder
              </TabsTrigger>
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Code
              </TabsTrigger>
            </TabsList>
            <TabsContent value="builder" className="mt-4">
              <ConditionBuilder
                key={isOpen ? 'open' : 'closed'}
                value={localValue}
                onChange={setLocalValue}
                questions={availableQuestions}
                participantAttributes={participantAttributes}
                responseFields={responseFields}
                languages={languages}
                onParseError={() => setEditorMode('code')}
              />
            </TabsContent>
            <TabsContent value="code" className="mt-4">
              <div className="flex justify-end mb-1.5">
                <VariablePicker
                  groups={variablePickerGroups}
                  triggerLabel="Insert variable"
                  onSelect={(path) => setLocalValue(localValue + path)}
                />
              </div>
              <div className="border rounded-md overflow-hidden">
                <CodeEditorJs
                  value={localValue}
                  onChange={setLocalValue}
                  height="180px"
                />
              </div>
              <Collapsible open={showHelp} onOpenChange={setShowHelp}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground p-0 h-auto has-[>svg]:ps-0 mb-1 mt-2"
                  >
                    {showHelp ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-sm">Variables & examples</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="text-sm text-muted-foreground space-y-2 bg-muted/50 rounded-md p-3 space-y-1.5 ">
                    <p className="font-medium">Available variables:</p>
                    <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                      <li>
                        {participantAttributes.map((attr, i) => (
                          <span key={attr.name}>
                            {i > 0 && ', '}
                            <code className="bg-muted px-1 rounded">
                              participant.{attr.name}
                            </code>
                          </span>
                        ))}{' '}
                        - Participant data
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001
                        </code>
                        ,{' '}
                        <code className="bg-muted px-1 rounded">
                          answers.Q002
                        </code>{' '}
                        - Question answer values (use question codes)
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001.A001
                        </code>{' '}
                        - Answer option selected (true/false)
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001.S001.A001
                        </code>{' '}
                        - Matrix cell value
                        (answers.question.subquestionCode.answerOptionCode)
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001.P001
                        </code>{' '}
                        - Multi-Part part value (answers.question.partCode)
                      </li>
                      <li>
                        {responseFields.map((field, i) => (
                          <span key={field.name}>
                            {i > 0 && ', '}
                            <code className="bg-muted px-1 rounded">
                              response.{field.name}
                            </code>
                          </span>
                        ))}{' '}
                        - Metadata about this response (e.g. the live
                        survey-taking language, distinct from
                        participant.language)
                      </li>
                    </ul>
                    <p className="font-medium mt-3">Examples:</p>
                    <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001 === &quot;yes&quot;
                        </code>{' '}
                        - Show if Q001 answer is &quot;yes&quot;
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q002 &gt; 5
                        </code>{' '}
                        - Show if Q002 answer is greater than 5
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001.A001
                        </code>{' '}
                        - Show if option A001 is selected in Q001
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001.S001.A001 === &quot;agree&quot;
                        </code>{' '}
                        - Show if matrix Q001, subquestion S001, answer option
                        A001 equals &quot;agree&quot;
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001.P001
                        </code>{' '}
                        - Show if part P001 of Multi-Part Q001 is answered
                        &quot;yes&quot;
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          answers.Q001.P001 &gt; 3
                        </code>{' '}
                        - Show if part P001&apos;s rating exceeds 3
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          participant.language === &quot;en&quot;
                        </code>{' '}
                        - Show only for participants whose stored profile
                        language is English
                      </li>
                      <li>
                        <code className="bg-muted px-1 rounded">
                          response.language === &quot;en&quot;
                        </code>{' '}
                        - Show only when the survey is currently being taken in
                        English
                      </li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </TabsContent>
          </Tabs>
          {displayErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {displayErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter className="gap-2">
          {hasCondition && (
            <Button
              variant="destructive"
              onClick={handleClear}
              disabled={isSaving}
            >
              Clear
            </Button>
          )}
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (isControlled) {
    return dialog
  }

  return (
    <div className="grid mb-4">
      <Label className="mb-2">
        {config.name}
        {hasCondition && (
          <span className="flex items-center gap-1 text-sm">
            {hasErrors ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )}
          </span>
        )}
      </Label>
      <div className="flex items-center gap-2">{dialog}</div>
      {hasErrors && (
        <div className="mt-2 text-sm text-destructive">
          {conditionErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}
    </div>
  )
}
