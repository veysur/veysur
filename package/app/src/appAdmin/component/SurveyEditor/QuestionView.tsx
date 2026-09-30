import React, { Suspense, useCallback, useMemo, useState } from 'react'
import { AlertCircle, GitBranch, Trash2 } from 'lucide-react'
import {
  ATTRIBUTE_CONDITION,
  isMatrixQuestionType,
  Survey,
  SurveyQuestion,
} from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'
import { Label } from 'component/shadcn/label'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'component/shadcn/tooltip'
import { getQuestionTypeByName } from 'component/SurveyQuestionType'
import { getQuestionTypeEditByName } from './getQuestionTypeEdit'
import { BadgeRequired } from 'component/Survey'
import {
  DialogConfirmClickable,
  ConfirmDialog,
} from 'component/DialogConfirmClickable'

import { ConditionEditor } from 'appAdmin/component/SurveyAttribute'
import { createConditionConfig } from 'appAdmin/component/SurveyAttributesPanel/attribute/createAttributeConfig'
import {
  QUESTION_ID_PREFIX,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from './constant'
import {
  useSurveyEditorFocus,
  useSurveyEditorStore,
  useStructuralChangeGuard,
  useConditionValidity,
  useTextExpressionVariablePicker,
  useSurveyContentFormat,
} from './hook'
import { MoveNav } from './MoveNav'
import { QuestionActionMenu } from './QuestionActionMenu'
import { useSurveyEditorValidation } from './validation'
import { FieldError } from 'component/Form'

interface QuestionProps {
  isFirst: boolean
  isLast: boolean
  question: SurveyQuestion
  presentation: Survey['presentation']
}

const QuestionViewComponent: React.FC<QuestionProps> = ({
  isFirst,
  isLast,
  question,
  presentation,
}) => {
  const [isConditionOpen, setIsConditionOpen] = useState(false)
  const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
  const { getFieldError } = useSurveyEditorValidation()
  const conditionValidity = useConditionValidity(question)
  const langOptions = useSurveyEditorStore(
    (state) => state.survey?.language?.options || ([] as string[]),
  )
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)
  const handleOnFocus = useCallback(() => {
    setSurveyFocus({
      entityType: SURVEY_ENTITY_TYPE_ELEMENT,
      id: question._id,
    })
  }, [setSurveyFocus, question._id])

  // Both lookups return a stable, pre-registered component reference from a
  // module-level registry keyed by question type (see getQuestionType.ts /
  // getQuestionTypeEdit.ts) - not a freshly created component - so no
  // memoization is needed here.
  const QuestionTypePreviewComponent = getQuestionTypeByName(question.type)
  const QuestionTypeEditComponent = getQuestionTypeEditByName(question.type)

  const focused = useMemo(() => {
    // Question itself is focused
    if (
      surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT &&
      surveyFocus?.id === question._id
    ) {
      return true
    }
    // Answer option or subquestion belonging to this question is focused
    if (
      (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ANSWER_OPTION ||
        surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SUBQUESTION) &&
      surveyFocus?.parentId === question._id
    ) {
      return true
    }
    return false
  }, [
    surveyFocus?.entityType,
    surveyFocus?.id,
    surveyFocus?.parentId,
    question._id,
  ])

  const effectiveLangDefault = focused ? '' : langDefault

  const updateQuestion = useSurveyEditorStore(
    (state) => state.operations?.updateQuestion,
  )
  const updateQuestionText = useSurveyEditorStore(
    (state) => state.operations?.updateQuestionText,
  )
  const updateQuestionDetail = useSurveyEditorStore(
    (state) => state.operations?.updateQuestionDetail,
  )
  const deleteQuestionDetail = useSurveyEditorStore(
    (state) => state.operations?.deleteQuestionDetail,
  )
  const deleteQuestion = useSurveyEditorStore(
    (state) => state.operations?.deleteQuestion,
  )
  const moveQuestionUp = useSurveyEditorStore(
    (state) => state.operations?.moveQuestionUp,
  )
  const moveQuestionDown = useSurveyEditorStore(
    (state) => state.operations?.moveQuestionDown,
  )
  const swapMatrixAxisText = useSurveyEditorStore(
    (state) => state.operations?.swapMatrixAxisText,
  )

  const handleQuestionTextChange = useCallback(
    (text: string) => {
      updateQuestionText?.(question._id, text, langEditing, langDefault)
    },
    [updateQuestionText, question._id, langEditing, langDefault],
  )

  const handleQuestionDetailChange = useCallback(
    (text: string) => {
      updateQuestionDetail?.(question._id, text, langEditing, langDefault)
    },
    [updateQuestionDetail, question._id, langEditing, langDefault],
  )

  const isRequired = Boolean(question.attributes?.required)
  const showNoAnswer = !isRequired && presentation?.noAnswer

  const {
    guardQuestionMoveUp,
    guardQuestionMoveDown,
    dialogState: moveDialogState,
    closeDialog: closeMoveDialog,
  } = useStructuralChangeGuard()

  const handleMoveUp = useCallback(() => {
    guardQuestionMoveUp(question._id, () => moveQuestionUp?.(question._id))
  }, [guardQuestionMoveUp, moveQuestionUp, question._id])

  const handleMoveDown = useCallback(() => {
    guardQuestionMoveDown(question._id, () => moveQuestionDown?.(question._id))
  }, [guardQuestionMoveDown, moveQuestionDown, question._id])

  const handleAddDetail = useCallback(() => {
    updateQuestionDetail?.(question._id, '', langEditing, langDefault)
  }, [updateQuestionDetail, question._id, langEditing, langDefault])

  const handleDeleteDetail = useCallback(() => {
    deleteQuestionDetail?.(question._id)
  }, [deleteQuestionDetail, question._id])

  const handleSwapAxisText = useCallback(() => {
    swapMatrixAxisText?.(question._id)
  }, [swapMatrixAxisText, question._id])

  const handleDelete = useCallback(() => {
    deleteQuestion?.(question._id)
  }, [deleteQuestion, question._id])

  const conditionConfig = useMemo(
    () => createConditionConfig(ATTRIBUTE_CONDITION),
    [],
  )

  const handleConditionChange = useCallback(
    async (value: string | null) => {
      await updateQuestion?.(question._id, { condition: value })
    },
    [updateQuestion, question._id],
  )

  const questionTextValue = useMemo(
    () => question.text.getLang(langEditing, ''),
    [question.text, langEditing],
  )

  const questionDetailValue = useMemo(
    () => question.detail?.getLang(langEditing, effectiveLangDefault) || '',
    [question.detail, langEditing, effectiveLangDefault],
  )

  const questionTextPlaceholder = useMemo(
    () => stripHtml(question.text.getLang(langDefault)) || 'Your question here',
    [question.text, langDefault],
  )

  const questionDetailPlaceholder = useMemo(
    () =>
      stripHtml(question.detail?.getLang(langDefault) || '') ||
      'Your question details here',
    [question.detail, langDefault],
  )

  const { variablePickerGroups, validate: validateTextExpressions } =
    useTextExpressionVariablePicker(question)

  const { format: contentFormat } = useSurveyContentFormat()

  const questionTextExpressionErrors = useMemo(
    () => validateTextExpressions(questionTextValue).map((e) => e.message),
    [validateTextExpressions, questionTextValue],
  )
  const questionDetailExpressionErrors = useMemo(
    () => validateTextExpressions(questionDetailValue).map((e) => e.message),
    [validateTextExpressions, questionDetailValue],
  )

  const textErrors = [
    ...(getFieldError('question', question._id, `text.${langEditing}`) ?? []),
    ...questionTextExpressionErrors,
  ]
  const detailErrors = [
    ...(getFieldError('question', question._id, `detail.${langEditing}`) ?? []),
    ...questionDetailExpressionErrors,
  ]

  const questionText = stripHtml(
    question.text.getLang(langEditing, langDefault),
  )
  const shortQuestionText =
    questionText.length > 30
      ? `${questionText.substring(0, 30)}...`
      : questionText

  const moveNav = (
    <MoveNav
      className={cn(['absolute top-4 -right-14'])}
      onMoveUp={isFirst ? undefined : handleMoveUp}
      onMoveDown={isLast ? undefined : handleMoveDown}
    />
  )

  return (
    <div
      id={`${QUESTION_ID_PREFIX}${question._id}`}
      data-testid="question-container"
      className={cn(
        'question mb-10 group relative transition-colors rounded-md p-4 mb-4 border-l-4 border-transparent',
        focused ? 'border-primary bg-editor-focus' : 'hover:bg-muted dark:hover:bg-muted/50',
      )}
    >
      <div className="grow relative" onClick={handleOnFocus}>
        <div className="flex gap-1">
          {/* Left: question text + detail */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start font-semibold text-foreground gap-1 mb-1">
              {question.condition && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsConditionOpen(true)}
                      className="h-6 w-6 flex-shrink-0"
                    >
                      {conditionValidity.isValid ? (
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {conditionValidity.isValid
                        ? 'Edit display condition'
                        : 'Display condition is invalid - this question will always show'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {!question.condition &&
                conditionValidity.invalidReferencingConditions.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        This question is referenced by an invalid condition
                        elsewhere in the survey
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              {isRequired && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <BadgeRequired />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Is required</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <div className="flex-1 min-w-0">
                <ContentEditor
                  key={langEditing}
                  value={questionTextValue}
                  variant="inline"
                  placeholder={questionTextPlaceholder}
                  withToolbar={true}
                  format={contentFormat}
                  variablePickerGroups={variablePickerGroups}
                  onChange={handleQuestionTextChange}
                  onFocus={handleOnFocus}
                  onClick={handleOnFocus}
                />
                <FieldError errors={textErrors} />
              </div>
            </div>
            {question.detail && (
              <div className="text-sm">
                <ContentEditor
                  value={questionDetailValue}
                  variant="inline"
                  placeholder={questionDetailPlaceholder}
                  withToolbar={true}
                  format={contentFormat}
                  variablePickerGroups={variablePickerGroups}
                  onChange={handleQuestionDetailChange}
                  onFocus={handleOnFocus}
                  onClick={handleOnFocus}
                />
                <FieldError errors={detailErrors} />
              </div>
            )}
          </div>

          {/* Right column: delete buttons aligned */}
          <div className="flex flex-col items-end flex-shrink-0 -mr-1">
            <div className="flex items-center gap-1">
              <DialogConfirmClickable
                variant="link-destructive"
                size="sm"
                title="Delete Question"
                message={`Are you sure you want to delete "${shortQuestionText}"?`}
                comment="This cannot be undone."
                actionText="Delete Question"
                confirmAction={handleDelete}
                className={cn(
                  'transition-opacity',
                  focused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <Trash2 className="h-4 w-4" />
              </DialogConfirmClickable>
              {(!question.detail || isMatrixQuestionType(question.type)) && (
                <div className="w-8">
                  <QuestionActionMenu
                    question={question}
                    onAddDetail={!question.detail ? handleAddDetail : undefined}
                    onSwapAxisText={handleSwapAxisText}
                  />
                </div>
              )}
            </div>
            {question.detail && (
              <DialogConfirmClickable
                variant="link-destructive"
                size="sm"
                title="Delete Question Details"
                message={`Are you sure you want to delete the details of question "${shortQuestionText}"?`}
                comment="This will delete all languages and cannot be undone."
                actionText="Delete"
                confirmAction={handleDeleteDetail}
                className={cn(
                  'transition-opacity',
                  focused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <Trash2 className="h-4 w-4" />
              </DialogConfirmClickable>
            )}
          </div>
        </div>
        <div className="mt-3">
          {!focused && QuestionTypePreviewComponent && (
            <Suspense fallback={null}>
              {/* eslint-disable-next-line react-hooks/static-components -- stable registry-provided reference, not created during render */}
              <QuestionTypePreviewComponent
                question={question}
                lang={langEditing}
                langDefault={langDefault}
                langOptions={langOptions}
              />
            </Suspense>
          )}
          {focused && QuestionTypeEditComponent && (
            <div className="relative" onClick={handleOnFocus}>
              {/* eslint-disable-next-line react-hooks/static-components -- stable registry-provided reference, not created during render */}
              <QuestionTypeEditComponent
                question={question}
                lang={langEditing}
                langDefault={effectiveLangDefault}
                langOptions={langOptions}
              />
            </div>
          )}
        </div>
        {showNoAnswer && (
          <div className="flex items-center gap-2 mt-5">
            <Checkbox
              id={`no-answer-editor-${question._id}`}
              disabled
              checked={false}
            />
            <Label
              htmlFor={`no-answer-editor-${question._id}`}
              className="cursor-not-allowed opacity-50 m-0"
            >
              No answer
            </Label>
          </div>
        )}
      </div>
      {focused && moveNav}
      {isConditionOpen && (
        <ConditionEditor
          config={conditionConfig}
          entity={question}
          value={question.condition ?? ''}
          onChange={handleConditionChange}
          isValid={true}
          open={isConditionOpen}
          onOpenChange={setIsConditionOpen}
        />
      )}
      <ConfirmDialog
        open={moveDialogState.open}
        title="Moving this question affects a condition"
        message={moveDialogState.message}
        actionText="Move anyway"
        onConfirm={moveDialogState.onConfirm}
        onOpenChange={(open) => !open && closeMoveDialog()}
      />
    </div>
  )
}

export const QuestionView = React.memo(QuestionViewComponent, (prev, next) => {
  return (
    prev.question._id === next.question._id &&
    prev.question === next.question &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast &&
    prev.presentation === next.presentation
  )
})
