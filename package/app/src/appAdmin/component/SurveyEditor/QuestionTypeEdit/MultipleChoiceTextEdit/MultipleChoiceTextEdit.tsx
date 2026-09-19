import React, { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import type { SurveyAnswerOption } from 'veysur-common'
import { schemaManager } from 'veysur-common'

import { cn } from 'common/cn'
import { stripHtml } from 'common/stripHtml'
import { Button } from 'component/shadcn/button'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import {
  DialogConfirmClickable,
  ConfirmDialog,
} from '@/component/DialogConfirmClickable'
import {
  useSurveyEditorStore,
  useSurveyEditorFocus,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
} from 'appAdmin/component/SurveyEditor'
import { MoveNav } from 'appAdmin/component/SurveyEditor/MoveNav'
import {
  useSurveyEditorValidation,
  useDebouncedValidation,
} from 'appAdmin/component/SurveyEditor/validation'
import { FieldError } from 'component/Form'
import { useStructuralChangeGuard } from 'appAdmin/component/SurveyEditor/hook/useStructuralChangeGuard'
import { useLabelExpressionErrors } from 'appAdmin/component/SurveyEditor/hook/useLabelExpressionErrors'

import { useDragAndDrop } from './hooks/useDragAndDrop'
import { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'

const answerOptionSchema = schemaManager.getSchema('surveyAnswerOption')

interface AnswerOptionRowProps {
  answerOption: SurveyAnswerOption
  questionId: string
  questionCode: string
  lang: string
  langDefault: string
  langEditing: string
  validationErrors?: string[]
  index: number
  totalCount: number
  onUpdateLabel: (
    questionId: string,
    answerOptionId: string,
    text: string,
    lang: string,
  ) => void
  onDelete: (questionId: string, answerOptionId: string) => void
}

const AnswerOptionRow: React.FC<AnswerOptionRowProps> = React.memo(
  ({
    answerOption,
    questionId,
    questionCode,
    lang,
    langDefault,
    langEditing,
    validationErrors,
    index,
    totalCount,
    onUpdateLabel,
    onDelete,
  }) => {
    const { surveyFocus, setSurveyFocus } = useSurveyEditorFocus()
    const moveAnswerOption = useSurveyEditorStore(
      (state) => state.operations?.moveAnswerOption,
    )
    const langDefaultFull = useSurveyEditorStore((state) => state.langDefault)

    // Sortable drag and drop
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: answerOption._id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const isFocused = React.useMemo(
      () =>
        surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ANSWER_OPTION &&
        surveyFocus?.id === answerOption._id &&
        surveyFocus?.parentId === questionId,
      [surveyFocus, answerOption._id, questionId],
    )

    const handleFocus = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation() // Prevent event from bubbling to question's onClick
        setSurveyFocus({
          entityType: SURVEY_ENTITY_TYPE_ANSWER_OPTION,
          id: answerOption._id,
          parentId: questionId,
        })
      },
      [setSurveyFocus, answerOption._id, questionId],
    )

    const handleLabelChange = useCallback(
      (text: string) => {
        onUpdateLabel(questionId, answerOption._id, text, langEditing)
      },
      [onUpdateLabel, questionId, answerOption._id, langEditing],
    )

    const handleDelete = useCallback(() => {
      onDelete(questionId, answerOption._id)
    }, [onDelete, questionId, answerOption._id])

    const handleMoveUp = useCallback(
      () => moveAnswerOption?.(questionId, answerOption._id, index - 1),
      [moveAnswerOption, questionId, answerOption._id, index],
    )

    const handleMoveDown = useCallback(
      () => moveAnswerOption?.(questionId, answerOption._id, index + 1),
      [moveAnswerOption, questionId, answerOption._id, index],
    )

    return (
      <div ref={setNodeRef} style={style}>
        <div
          key={`${questionCode}-${answerOption.code}`}
          className={cn(
            'flex flex-col relative transition-colors rounded-sm py-0.5',
            {
              'bg-editor-active': isFocused,
            },
          )}
          onClick={handleFocus}
        >
          <div className="group/row flex flex-row items-center ps-3">
            <GripVertical
              {...listeners}
              {...attributes}
              className="drag-handle mr-2 h-4 w-4 cursor-grab"
            />
            <div className="flex-1 text-base" onClick={handleFocus}>
              <ContentEditor
                value={answerOption.label.getLang(lang, langDefault)}
                variant="inline"
                placeholder={
                  stripHtml(
                    answerOption.label.getLang(lang, langDefaultFull),
                  ) || 'Answer option here'
                }
                withToolbar={false}
                onChange={handleLabelChange}
              />
              <FieldError errors={validationErrors} />
            </div>
            <div
              className={cn(
                'flex items-center',
                isFocused
                  ? ''
                  : 'invisible pointer-events-none group-hover/row:visible group-hover/row:pointer-events-auto',
              )}
            >
              <DialogConfirmClickable
                element={Button}
                title="Delete Answer Option"
                message={
                  `Are you sure you want to delete ` +
                  `"${answerOption.label.getLang(lang, langDefaultFull)}". ` +
                  `This cannot be undone.`
                }
                actionText="Delete"
                confirmAction={handleDelete}
                variant="link-destructive"
                size="sm"
                className="delete"
              >
                <Trash2 className="h-4 w-4" />
              </DialogConfirmClickable>
              <MoveNav
                layout="inline"
                onMoveUp={index === 0 ? undefined : handleMoveUp}
                onMoveDown={
                  index === totalCount - 1 ? undefined : handleMoveDown
                }
                itemType="answer option"
              />
            </div>
          </div>
        </div>
      </div>
    )
  },
  (prev, next) => {
    return (
      prev.answerOption._id === next.answerOption._id &&
      prev.answerOption === next.answerOption &&
      prev.lang === next.lang &&
      prev.langDefault === next.langDefault &&
      prev.langEditing === next.langEditing &&
      prev.validationErrors === next.validationErrors &&
      prev.index === next.index &&
      prev.totalCount === next.totalCount
    )
  },
)

AnswerOptionRow.displayName = 'AnswerOptionRow'

const MultipleChoiceTextEditComponent: React.FC<QuestionTypeProps> = ({
  question,
  lang,
  langDefault,
}) => {
  // Optimized: Subscribe to specific operation functions with reference equality
  const updateAnswerOptionLabel = useSurveyEditorStore(
    (state) => state.operations?.updateAnswerOptionLabel,
  )
  const deleteAnswerOption = useSurveyEditorStore(
    (state) => state.operations?.deleteAnswerOption,
  )
  const addAnswerOption = useSurveyEditorStore(
    (state) => state.operations?.addAnswerOption,
  )
  const moveAnswerOption = useSurveyEditorStore(
    (state) => state.operations?.moveAnswerOption,
  )
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const { getFieldError } = useSurveyEditorValidation()
  const getLabelExpressionErrors = useLabelExpressionErrors(question)
  const { debouncedValidateField } = useDebouncedValidation()
  const clearValidationError = useSurveyEditorStore(
    (state) => state.clearValidationError,
  )
  const { guardAnswerOptionRemoval, dialogState, closeDialog } =
    useStructuralChangeGuard()

  const { handleDragStart, handleDragEnd } = useDragAndDrop(
    question,
    moveAnswerOption,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 0.9 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  const sortableIds = question?.answerOptions?.reduce<string[]>(
    (accumulator, currentGroup) => {
      accumulator.push(currentGroup._id)
      return accumulator
    },
    [],
  )

  const handleUpdateLabel = useCallback(
    (
      questionId: string,
      answerOptionId: string,
      text: string,
      lang: string,
    ) => {
      updateAnswerOptionLabel?.(
        questionId,
        answerOptionId,
        text,
        lang,
        langDefault,
      )

      if (text === '' && lang !== langDefault) {
        clearValidationError('answerOption', answerOptionId, `label.${lang}`)
      } else {
        debouncedValidateField(
          answerOptionSchema,
          `label.${lang}`,
          text,
          'answerOption',
          answerOptionId,
          `label.${lang}`,
        )
      }
    },
    [
      updateAnswerOptionLabel,
      debouncedValidateField,
      clearValidationError,
      langDefault,
    ],
  )

  const handleDeleteAnswerOption = useCallback(
    (questionId: string, answerOptionId: string) => {
      const answerOptionCode = question.answerOptions?.find(
        (option) => option._id === answerOptionId,
      )?.code
      const commit = () => deleteAnswerOption?.(questionId, answerOptionId)
      if (answerOptionCode) {
        guardAnswerOptionRemoval(questionId, answerOptionCode, commit)
      } else {
        commit()
      }
    },
    [deleteAnswerOption, guardAnswerOptionRemoval, question.answerOptions],
  )

  const handleAddAnswerOption = useCallback(() => {
    addAnswerOption?.(question._id)
  }, [addAnswerOption, question._id])

  const answerOptions = question?.answerOptions || []
  const hasOther = Boolean(question?.attributes?.choiceOther)
  return (
    <div className="grid">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds || []}
          strategy={verticalListSortingStrategy}
        >
          {answerOptions.map((answerOption, i) => {
            const validationErrors = [
              ...(getFieldError(
                'answerOption',
                answerOption._id,
                `label.${langEditing}`,
              ) ?? []),
              ...getLabelExpressionErrors(
                answerOption.label.getLang(langEditing, langDefault),
              ),
            ]
            return (
              <AnswerOptionRow
                key={answerOption._id}
                answerOption={answerOption}
                questionId={question._id}
                questionCode={question.code}
                lang={lang}
                langDefault={langDefault}
                langEditing={langEditing}
                validationErrors={validationErrors}
                index={i}
                totalCount={answerOptions.length}
                onUpdateLabel={handleUpdateLabel}
                onDelete={handleDeleteAnswerOption}
              />
            )
          })}
        </SortableContext>
      </DndContext>
      {hasOther && (
        <div className="flex flex-row items-center ps-3 py-0.5 text-muted-foreground">
          <GripVertical className="mr-2 h-4 w-4 opacity-0" />
          <span className="flex-1 text-base italic">Other (free text)</span>
        </div>
      )}
      <Button
        className="mt-3 mx-1"
        variant="outline"
        size="sm"
        onClick={handleAddAnswerOption}
      >
        Add answer option
      </Button>
      <ConfirmDialog
        open={dialogState.open}
        title="This answer option is used in a condition"
        message={dialogState.message}
        actionText="Delete anyway"
        onConfirm={dialogState.onConfirm}
        onOpenChange={(open) => !open && closeDialog()}
      />
    </div>
  )
}

export const MultipleChoiceTextEdit = React.memo(
  MultipleChoiceTextEditComponent,
  (prev, next) => {
    return (
      prev.question._id === next.question._id &&
      prev.question === next.question &&
      prev.lang === next.lang &&
      prev.langDefault === next.langDefault
    )
  },
)

MultipleChoiceTextEdit.displayName = 'MultipleChoiceTextEdit'
