import React, { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { schemaManager } from 'veysur-common'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { useAuth, useProjectDomain } from 'appAdmin/hook'
import {
  useSurveyEditorValidation,
  useDebouncedValidation,
} from 'appAdmin/component/SurveyEditor/validation'
import { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'

import { useLabelExpressionErrors } from 'appAdmin/component/SurveyEditor/hook/useLabelExpressionErrors'

import { useDragAndDrop } from '../MultipleChoiceTextEdit/hooks'
import { ImageAnswerOption } from './ImageAnswerOption'

const answerOptionSchema = schemaManager.getSchema('surveyAnswerOption')

/**
 * Main edit component for image-based multiple choice questions.
 * Manages:
 * - Drag and drop reordering
 * - Answer option CRUD operations
 * Note: File cleanup is handled automatically by the backend during patch processing
 */
const MultipleChoiceImageEditComponent: React.FC<QuestionTypeProps> = ({
  question,
  lang,
  langDefault,
}) => {
  const project = useProjectDomain()
  const survey = useSurveyEditorStore((state) => state.survey)
  const { auth } = useAuth()

  const deleteAnswerOption = useSurveyEditorStore(
    (state) => state.operations?.deleteAnswerOption,
  )
  const addAnswerOption = useSurveyEditorStore(
    (state) => state.operations?.addAnswerOption,
  )
  const moveAnswerOption = useSurveyEditorStore(
    (state) => state.operations?.moveAnswerOption,
  )
  const updateAnswerOptionImage = useSurveyEditorStore(
    (state) => state.operations?.updateAnswerOptionImage,
  )
  const updateAnswerOptionLabel = useSurveyEditorStore(
    (state) => state.operations?.updateAnswerOptionLabel,
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
    useSensor(PointerSensor, { activationConstraint: { distance: 0.9 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  )

  const sortableIds = question?.answerOptions?.reduce<string[]>(
    (accumulator, currentOption) => {
      accumulator.push(currentOption._id)
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

  const handleUpdateImage = useCallback(
    (
      questionId: string,
      answerOptionId: string,
      imageData: { imagePath: string | null; imageFileId: string | null },
    ) => {
      updateAnswerOptionImage?.(
        questionId,
        answerOptionId,
        imageData,
        langEditing ?? langDefault ?? 'en',
      )
    },
    [updateAnswerOptionImage, langEditing, langDefault],
  )

  const handleDeleteAnswerOption = useCallback(
    (questionId: string, answerOptionId: string) => {
      // Delete answer option from state
      // Backend will handle file cleanup automatically
      deleteAnswerOption?.(questionId, answerOptionId)
    },
    [deleteAnswerOption],
  )

  const handleAddAnswerOption = useCallback(() => {
    addAnswerOption?.(question._id, {}, undefined, langDefault)
  }, [addAnswerOption, question._id, langDefault])

  const surveyId = survey?._id
  const projectId = project?._id
  const jwtToken = auth?.jwt?.token

  const answerOptions = question?.answerOptions || []

  if (!surveyId || !projectId) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  const cols = question?.attributes?.columns ?? 1
  const colsClass =
    { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[
      cols as 1 | 2 | 3
    ] ?? 'grid-cols-1'

  return (
    <div className="grid">
      <div className={cn('grid gap-3', colsClass)}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds || []}
            strategy={rectSortingStrategy}
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
                <ImageAnswerOption
                  key={answerOption._id}
                  answerOption={answerOption}
                  questionId={question._id}
                  questionCode={question.code}
                  surveyId={surveyId}
                  projectId={projectId}
                  jwtToken={jwtToken}
                  lang={lang}
                  langDefault={langDefault}
                  langEditing={langEditing}
                  validationErrors={validationErrors}
                  index={i}
                  totalCount={answerOptions.length}
                  onUpdateImage={handleUpdateImage}
                  onUpdateLabel={handleUpdateLabel}
                  onDelete={handleDeleteAnswerOption}
                />
              )
            })}
          </SortableContext>
        </DndContext>
      </div>
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

export const MultipleChoiceImageEdit = React.memo(
  MultipleChoiceImageEditComponent,
  (prev, next) => {
    return (
      prev.question._id === next.question._id &&
      prev.question === next.question &&
      prev.lang === next.lang &&
      prev.langDefault === next.langDefault
    )
  },
)
