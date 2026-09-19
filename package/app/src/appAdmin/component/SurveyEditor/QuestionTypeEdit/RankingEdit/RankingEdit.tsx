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

const DRAG_ACTIVATION_DISTANCE = 0.9
const DRAG_ACTIVATION_DELAY_MS = 250
const DRAG_ACTIVATION_TOLERANCE = 5
import { stripHtml } from 'common/stripHtml'
import { Button } from 'component/shadcn/button'
import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { DialogConfirmClickable } from '@/component/DialogConfirmClickable'
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
        e?.stopPropagation()
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

const RankingEditComponent: React.FC<QuestionTypeProps> = ({
  question,
  lang,
  langDefault,
}) => {
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
  const { debouncedValidateField } = useDebouncedValidation()
  const getLabelExpressionErrors = useLabelExpressionErrors(question)

  const { handleDragStart, handleDragEnd } = useDragAndDrop(
    question,
    moveAnswerOption,
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: DRAG_ACTIVATION_DELAY_MS,
        tolerance: DRAG_ACTIVATION_TOLERANCE,
      },
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
      const answerOption = question?.answerOptions?.getById(answerOptionId)
      const validationValue =
        text === '' && lang !== langDefault
          ? (answerOption?.label.getLang(langDefault, langDefault) ?? text)
          : text
      debouncedValidateField(
        answerOptionSchema,
        `label.${lang}`,
        validationValue,
        'answerOption',
        answerOptionId,
        `label.${lang}`,
      )
    },
    [updateAnswerOptionLabel, debouncedValidateField, question, langDefault],
  )

  const handleDeleteAnswerOption = useCallback(
    (questionId: string, answerOptionId: string) => {
      deleteAnswerOption?.(questionId, answerOptionId)
    },
    [deleteAnswerOption],
  )

  const handleAddAnswerOption = useCallback(() => {
    addAnswerOption?.(question._id)
  }, [addAnswerOption, question._id])

  const answerOptions = question?.answerOptions || []

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
      <Button
        className="mt-3 mx-1"
        variant="outline"
        size="sm"
        onClick={handleAddAnswerOption}
      >
        Add answer option
      </Button>
    </div>
  )
}

export const RankingEdit = React.memo(RankingEditComponent, (prev, next) => {
  return (
    prev.question._id === next.question._id &&
    prev.question === next.question &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault
  )
})

RankingEdit.displayName = 'RankingEdit'
