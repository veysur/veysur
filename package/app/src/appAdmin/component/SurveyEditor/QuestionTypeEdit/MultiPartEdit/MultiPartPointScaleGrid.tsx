import React, { useMemo } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { getPointScaleCount } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'
import { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'
import { useLabelExpressionErrors } from 'appAdmin/component/SurveyEditor/hook/useLabelExpressionErrors'

import { MultiPartPointScaleHeader } from './MultiPartPointScaleHeader'
import { MultiPartPointScaleRow } from './MultiPartPointScaleRow'
import { useDragAndDrop } from './hook'

interface MultiPartPointScaleGridProps extends QuestionTypeProps {
  partType: string
}

/**
 * WYSIWYG grid for point-scale Multi-Part questions (star/point5/point10) —
 * parts as rows, the shared fixed point labels as columns, mirroring
 * `MatrixEdit`'s table layout. Unlike Matrix, the column axis is fixed in
 * count and order (see `PointScaleLabelEdit`), so only row drag-and-drop is
 * needed — `MultiPartEdit`'s existing single-axis hook is reused unchanged.
 */
const MultiPartPointScaleGridComponent: React.FC<
  MultiPartPointScaleGridProps
> = ({ question, partType, lang, langDefault }) => {
  const operations = useSurveyEditorStore((state) => state.operations)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const getLabelExpressionErrors = useLabelExpressionErrors(question)

  const parts = useMemo(
    () => question.subquestions || [],
    [question.subquestions],
  )
  const answerOptions = question.answerOptions || []
  const pointCount = getPointScaleCount(partType) ?? answerOptions.length

  const { sensors, handleDragEnd, rowIds, handleAddPart } = useDragAndDrop({
    questionId: question._id,
    parts,
  })

  return (
    <div className="overflow-x-auto pb-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-1 w-56 max-w-56" />
              {answerOptions.map((ao, i) => (
                <MultiPartPointScaleHeader
                  key={ao._id}
                  questionId={question._id}
                  partType={partType}
                  answerId={ao._id}
                  index={i}
                  label={ao.label.getLang(lang, langDefault)}
                  lang={lang}
                  langDefault={langDefault}
                  errors={getLabelExpressionErrors(
                    ao.label.getLang(langEditing, langDefault),
                  )}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              {parts.map((part, i) => (
                <MultiPartPointScaleRow
                  key={part._id}
                  entityId={part._id}
                  labelL10n={part.text}
                  partType={partType}
                  pointCount={pointCount}
                  questionId={question._id}
                  lang={lang}
                  langDefault={langDefault}
                  langEditing={langEditing}
                  index={i}
                  totalCount={parts.length}
                  errors={getLabelExpressionErrors(
                    part.text?.getLang(langEditing, langDefault),
                  )}
                  onUpdateText={operations?.updateSubquestionText ?? (() => {})}
                  onDelete={operations?.deleteSubquestion ?? (() => {})}
                />
              ))}
            </SortableContext>
            <tr>
              <td colSpan={pointCount + 1} className="p-1">
                <Button variant="outline" size="sm" onClick={handleAddPart}>
                  + Part
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </DndContext>
    </div>
  )
}

export const MultiPartPointScaleGrid = React.memo(
  MultiPartPointScaleGridComponent,
  (prev, next) =>
    prev.question._id === next.question._id &&
    prev.question === next.question &&
    prev.partType === next.partType &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault,
)
