import React, { useCallback, useMemo } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  ATTRIBUTE_MATRIX_ORIENTATION,
  MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
  QUESTION_TYPE_CHECKBOX,
} from 'veysur-common'

import { Button } from 'component/shadcn/button'
import {
  useSurveyEditorStore,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from 'appAdmin/component/SurveyEditor'
import { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'
import { useLabelExpressionErrors } from 'appAdmin/component/SurveyEditor/hook/useLabelExpressionErrors'

import { MatrixColumnHeader } from './MatrixColumnHeader'
import { MatrixRow } from './MatrixRow'
import { useDragAndDrop } from './hook'

const MatrixEditComponent: React.FC<QuestionTypeProps> = ({
  question,
  lang,
  langDefault,
}) => {
  const operations = useSurveyEditorStore((state) => state.operations)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const getLabelExpressionErrors = useLabelExpressionErrors(question)
  const labelErrors = (labelL10n: { getLang(l: string, d: string): string }) =>
    getLabelExpressionErrors(labelL10n.getLang(langEditing, langDefault))

  const answerOptions = question?.answerOptions || []
  const subquestions = useMemo(
    () => question.subquestions || [],
    [question.subquestions],
  )
  const isSubquestionsAsRows =
    question?.attributes?.[ATTRIBUTE_MATRIX_ORIENTATION] ===
    MATRIX_ORIENTATION_SUBQUESTIONS_ROWS

  const { sensors, handleDragEnd, colIds, rowIds } = useDragAndDrop({
    questionId: question._id,
    subquestions,
    answerOptions,
    isSubquestionsAsRows,
  })

  const handleAddAnswerOption = useCallback(
    () => operations?.addAnswerOption?.(question._id),
    [operations, question._id],
  )

  const handleAddSubquestion = useCallback(
    () => operations?.addSubquestion?.(question._id),
    [operations, question._id],
  )

  const handleAddColumn = isSubquestionsAsRows
    ? handleAddAnswerOption
    : handleAddSubquestion
  const handleAddRow = isSubquestionsAsRows
    ? handleAddSubquestion
    : handleAddAnswerOption

  // cellTypes when answer options are rows: one entry per subquestion column
  const cellTypesAnswerOptionRows = useMemo(
    () => subquestions.map((sq) => sq.type || QUESTION_TYPE_CHECKBOX),
    [subquestions],
  )

  // cellTypes when subquestions are rows: stable per-subquestion arrays keyed by id
  const cellTypesSubquestionRowsMap = useMemo(() => {
    const count = answerOptions.length
    return new Map(
      subquestions.map((sq) => [
        sq._id,
        Array<string>(count).fill(sq.type || QUESTION_TYPE_CHECKBOX),
      ]),
    )
  }, [subquestions, answerOptions.length])

  const noop = useCallback(() => {}, [])

  return (
    <div className="overflow-x-auto pb-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-1 min-w-[160px]" />
              <SortableContext
                items={colIds}
                strategy={horizontalListSortingStrategy}
              >
                {isSubquestionsAsRows
                  ? answerOptions.map((ao, i) => (
                      <MatrixColumnHeader
                        key={ao._id}
                        entityId={ao._id}
                        entityType={SURVEY_ENTITY_TYPE_ANSWER_OPTION}
                        labelL10n={ao.label}
                        questionId={question._id}
                        lang={lang}
                        langDefault={langDefault}
                        langEditing={langEditing}
                        index={i}
                        totalCount={answerOptions.length}
                        errors={labelErrors(ao.label)}
                        onUpdateText={
                          operations?.updateAnswerOptionLabel ?? noop
                        }
                        onDelete={operations?.deleteAnswerOption ?? noop}
                      />
                    ))
                  : subquestions.map((sq, i) => (
                      <MatrixColumnHeader
                        key={sq._id}
                        entityId={sq._id}
                        entityType={SURVEY_ENTITY_TYPE_SUBQUESTION}
                        labelL10n={sq.text}
                        questionId={question._id}
                        lang={lang}
                        langDefault={langDefault}
                        langEditing={langEditing}
                        index={i}
                        totalCount={subquestions.length}
                        errors={labelErrors(sq.text)}
                        onUpdateText={operations?.updateSubquestionText ?? noop}
                        onDelete={operations?.deleteSubquestion ?? noop}
                      />
                    ))}
              </SortableContext>
              <th className="p-1 align-top">
                <Button variant="outline" size="sm" onClick={handleAddColumn}>
                  + Column
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              {isSubquestionsAsRows
                ? subquestions.map((sq, i) => (
                    <MatrixRow
                      key={sq._id}
                      entityId={sq._id}
                      entityCode={sq.code}
                      entityType={SURVEY_ENTITY_TYPE_SUBQUESTION}
                      labelL10n={sq.text}
                      cellTypes={cellTypesSubquestionRowsMap.get(sq._id) ?? []}
                      questionId={question._id}
                      lang={lang}
                      langDefault={langDefault}
                      langEditing={langEditing}
                      index={i}
                      totalCount={subquestions.length}
                      errors={labelErrors(sq.text)}
                      onUpdateText={operations?.updateSubquestionText ?? noop}
                      onDelete={operations?.deleteSubquestion ?? noop}
                    />
                  ))
                : answerOptions.map((ao, i) => (
                    <MatrixRow
                      key={ao._id}
                      entityId={ao._id}
                      entityCode={ao.code}
                      entityType={SURVEY_ENTITY_TYPE_ANSWER_OPTION}
                      labelL10n={ao.label}
                      cellTypes={cellTypesAnswerOptionRows}
                      questionId={question._id}
                      lang={lang}
                      langDefault={langDefault}
                      langEditing={langEditing}
                      index={i}
                      totalCount={answerOptions.length}
                      errors={labelErrors(ao.label)}
                      onUpdateText={operations?.updateAnswerOptionLabel ?? noop}
                      onDelete={operations?.deleteAnswerOption ?? noop}
                    />
                  ))}
            </SortableContext>
            <tr>
              <td colSpan={colIds.length + 2} className="p-1">
                <Button variant="outline" size="sm" onClick={handleAddRow}>
                  + Row
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </DndContext>
    </div>
  )
}

export const MatrixEdit = React.memo(
  MatrixEditComponent,
  (prev, next) =>
    prev.question._id === next.question._id &&
    prev.question === next.question &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault,
)
