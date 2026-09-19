import React, { useCallback, useMemo, useState } from 'react'
import { AlertCircle, Filter, Trash2 } from 'lucide-react'
import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { ATTRIBUTE_CONDITION, SurveySection } from 'veysur-common'

import { ContentEditor } from 'appAdmin/component/ContentEditor'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'component/shadcn/tooltip'
import {
  DialogConfirmClickable,
  ConfirmDialog,
} from 'component/DialogConfirmClickable'

import { ConditionEditor } from 'appAdmin/component/SurveyAttribute'
import { createConditionConfig } from 'appAdmin/component/SurveyAttributesPanel/attribute/createAttributeConfig'
import {
  QUESTION_GROUP_ID_PREFIX,
  SURVEY_ENTITY_TYPE_SECTION,
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
import { QuestionGroupActionMenu } from './QuestionGroupActionMenu'
import { useSurveyEditorValidation } from './validation'
import { FieldError } from 'component/Form'

interface QuestionGroupViewProps {
  group: SurveySection
  index: number
  isLast: boolean
}

const QuestionGroupViewComponent: React.FC<QuestionGroupViewProps> = ({
  group,
  index,
  isLast,
}) => {
  const [isConditionOpen, setIsConditionOpen] = useState(false)
  const updateQuestionGroup = useSurveyEditorStore(
    (state) => state.operations?.updateSection,
  )
  const updateQuestionGroupName = useSurveyEditorStore(
    (state) => state.operations?.updateSectionName,
  )
  const updateQuestionGroupDescription = useSurveyEditorStore(
    (state) => state.operations?.updateSectionDescription,
  )
  const deleteQuestionGroupDescription = useSurveyEditorStore(
    (state) => state.operations?.deleteSectionDescription,
  )
  const deleteQuestionGroup = useSurveyEditorStore(
    (state) => state.operations?.deleteSection,
  )
  const moveQuestionGroup = useSurveyEditorStore(
    (state) => state.operations?.moveSection,
  )
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const langDefault = useSurveyEditorStore((state) => state.langDefault)

  const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
  const conditionValidity = useConditionValidity(group)
  const { getFieldError } = useSurveyEditorValidation()

  const handleOnFocus = useCallback(() => {
    setSurveyFocus({ entityType: SURVEY_ENTITY_TYPE_SECTION, id: group._id })
  }, [setSurveyFocus, group._id])

  const handleGroupNameChange = useCallback(
    (value: string) => {
      updateQuestionGroupName?.(group._id, value, langEditing, langDefault)
    },
    [updateQuestionGroupName, group._id, langEditing, langDefault],
  )

  const handleGroupDescChange = useCallback(
    (value: string) => {
      updateQuestionGroupDescription?.(
        group._id,
        value,
        langEditing,
        langDefault,
      )
    },
    [updateQuestionGroupDescription, group._id, langEditing, langDefault],
  )

  const handleAddDescription = useCallback(() => {
    updateQuestionGroupDescription?.(group._id, '', langEditing, langDefault)
  }, [updateQuestionGroupDescription, group._id, langEditing, langDefault])

  const handleDeleteDescription = useCallback(() => {
    deleteQuestionGroupDescription?.(group._id)
  }, [deleteQuestionGroupDescription, group._id])

  const handleDelete = useCallback(() => {
    deleteQuestionGroup?.(group._id)
  }, [deleteQuestionGroup, group._id])

  const conditionConfig = useMemo(
    () => createConditionConfig(ATTRIBUTE_CONDITION),
    [],
  )

  const handleConditionChange = useCallback(
    async (value: string | null) => {
      await updateQuestionGroup?.(group._id, { condition: value })
    },
    [updateQuestionGroup, group._id],
  )

  const {
    guardQuestionGroupMove,
    dialogState: moveDialogState,
    closeDialog: closeMoveDialog,
  } = useStructuralChangeGuard()

  const handleMoveUp = useCallback(() => {
    guardQuestionGroupMove(group._id, index - 1, () =>
      moveQuestionGroup?.(group._id, index - 1),
    )
  }, [guardQuestionGroupMove, moveQuestionGroup, group._id, index])

  const handleMoveDown = useCallback(() => {
    guardQuestionGroupMove(group._id, index + 1, () =>
      moveQuestionGroup?.(group._id, index + 1),
    )
  }, [guardQuestionGroupMove, moveQuestionGroup, group._id, index])

  const focused =
    surveyFocus?.entityType == SURVEY_ENTITY_TYPE_SECTION &&
    surveyFocus?.id == group._id

  const effectiveLangDefault = focused ? '' : langDefault

  const { variablePickerGroups, validate: validateTextExpressions } =
    useTextExpressionVariablePicker(group)

  const { format: contentFormat } = useSurveyContentFormat()

  const groupNameValue = group.name.getLang(langEditing, effectiveLangDefault)
  const groupDescValue =
    group.desc?.getLang(langEditing, effectiveLangDefault) || ''

  const groupNameExpressionErrors = useMemo(
    () => validateTextExpressions(groupNameValue).map((e) => e.message),
    [validateTextExpressions, groupNameValue],
  )
  const groupDescExpressionErrors = useMemo(
    () => validateTextExpressions(groupDescValue).map((e) => e.message),
    [validateTextExpressions, groupDescValue],
  )

  const nameErrors = [
    ...(getFieldError('questionGroup', group._id, `name.${langEditing}`) ?? []),
    ...groupNameExpressionErrors,
  ]
  const descErrors = [
    ...(getFieldError('questionGroup', group._id, `desc.${langEditing}`) ?? []),
    ...groupDescExpressionErrors,
  ]

  const groupName = stripHtml(group.name.getLang(langEditing, langDefault))
  const shortGroupName =
    groupName.length > 25 ? `${groupName.substring(0, 25)}...` : groupName

  const moveNav = (
    <div className={cn(['absolute inset-y-1/2 right-0', { hidden: !focused }])}>
      <MoveNav
        className="absolute -right-14"
        onMoveUp={index == 0 ? undefined : handleMoveUp}
        onMoveDown={isLast ? undefined : handleMoveDown}
      />
    </div>
  )

  return (
    <>
      <div
        id={`${QUESTION_GROUP_ID_PREFIX}${group._id}`}
        className={cn(
          'relative group transition-colors rounded-md px-4 mb-1 hover:bg-editor-active',
          {
            'bg-editor-active': focused,
          },
        )}
      >
        <div
          className="grow relative"
          data-testid="question-group-container"
          onClick={handleOnFocus}
        >
          <div className="flex gap-1 items-start">
            {/* Left: name + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center min-h-8 font-bold text-xs text-muted-foreground leading-relaxed gap-1">
                {group.condition && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setIsConditionOpen(true)}
                        className="flex items-center flex-shrink-0"
                      >
                        {conditionValidity.isValid ? (
                          <Filter className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {conditionValidity.isValid
                          ? 'Edit display condition'
                          : 'Display condition is invalid - this group will always show'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {!group.condition &&
                  conditionValidity.invalidReferencingConditions.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          This group is referenced by an invalid condition
                          elsewhere in the survey
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                <div className="flex-1 min-w-0">
                  <ContentEditor
                    value={groupNameValue}
                    variant="inline"
                    placeholder={
                      stripHtml(group.name.getLang(langDefault)) ||
                      'Your group name here'
                    }
                    onChange={handleGroupNameChange}
                    onClick={handleOnFocus}
                    onFocus={handleOnFocus}
                  />
                  <FieldError errors={nameErrors} />
                </div>
              </div>
              {group.desc && (
                <div className="text-sm">
                  <ContentEditor
                    value={groupDescValue}
                    variant="inline"
                    placeholder={
                      stripHtml(group.desc.getLang(langDefault)) ||
                      'Your group description here'
                    }
                    withToolbar={true}
                    format={contentFormat}
                    variablePickerGroups={variablePickerGroups}
                    onChange={handleGroupDescChange}
                    onClick={handleOnFocus}
                    onFocus={handleOnFocus}
                  />
                  <FieldError errors={descErrors} />
                </div>
              )}
            </div>

            {/* Right column: delete buttons aligned */}
            <div className="flex flex-col items-end flex-shrink-0 -mr-1">
              <div className="flex items-center gap-1">
                <DialogConfirmClickable
                  variant="link-destructive"
                  size="sm"
                  title="Delete Group"
                  message={`Are you sure you want to delete the group "${shortGroupName}" and all its questions?`}
                  comment="This cannot be undone and will delete all questions in this group."
                  actionText="Delete"
                  confirmAction={handleDelete}
                  data-testid="delete-group-trigger"
                  className={cn(
                    'transition-opacity',
                    focused
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </DialogConfirmClickable>
                {!group.desc && (
                  <div className="w-8">
                    <QuestionGroupActionMenu
                      group={group}
                      onAddDescription={handleAddDescription}
                    />
                  </div>
                )}
              </div>
              {group.desc && (
                <DialogConfirmClickable
                  variant="link-destructive"
                  size="sm"
                  title="Delete Group Description"
                  message={`Are you sure you want to delete the description of group "${shortGroupName}"?`}
                  comment="This cannot be undone and will delete all languages."
                  actionText="Delete"
                  confirmAction={handleDeleteDescription}
                  className={cn(
                    'transition-opacity',
                    focused
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </DialogConfirmClickable>
              )}
            </div>
          </div>
        </div>
        {moveNav}
      </div>
      {isConditionOpen && (
        <ConditionEditor
          config={conditionConfig}
          entity={group}
          value={group.condition ?? ''}
          onChange={handleConditionChange}
          isValid={true}
          open={isConditionOpen}
          onOpenChange={setIsConditionOpen}
        />
      )}
      <ConfirmDialog
        open={moveDialogState.open}
        title="Moving this group affects a condition"
        message={moveDialogState.message}
        actionText="Move anyway"
        onConfirm={moveDialogState.onConfirm}
        onOpenChange={(open) => !open && closeMoveDialog()}
      />
    </>
  )
}

export const QuestionGroupView = React.memo(
  QuestionGroupViewComponent,
  (prev, next) => {
    return (
      prev.group._id === next.group._id &&
      prev.group === next.group &&
      prev.index === next.index &&
      prev.isLast === next.isLast
    )
  },
)
