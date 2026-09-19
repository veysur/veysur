import React, { useMemo } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { getMultiPartTypeConfig, getPointScaleCount } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'
import { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'
import { useLabelExpressionErrors } from 'appAdmin/component/SurveyEditor/hook/useLabelExpressionErrors'

import { MultiPartRow } from './MultiPartRow'
import { MultiPartPointScaleGrid } from './MultiPartPointScaleGrid'
import { useDragAndDrop } from './hook'

/**
 * Admin editor for Multi-Part questions — the one-axis sibling of
 * `MatrixEdit`: a sortable list of parts only, no column headers, no
 * orientation toggle, no cell-type preview grid (Multi-Part has no
 * per-part answer-option axis). The three point-scale variants
 * (multiPartStarRating/Point5/Point10) are an exception: every part shares a
 * single, fixed set of point labels stored once on the parent question's own
 * `answerOptions` (see `questionType/pointScale.ts`) — for those,
 * `MultiPartPointScaleGrid` renders a WYSIWYG table instead, with the point
 * labels as columns.
 */
const MultiPartEditComponent: React.FC<QuestionTypeProps> = ({
  question,
  lang,
  langDefault,
}) => {
  const operations = useSurveyEditorStore((state) => state.operations)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const getLabelExpressionErrors = useLabelExpressionErrors(question)

  const parts = useMemo(
    () => question.subquestions || [],
    [question.subquestions],
  )

  const { sensors, handleDragEnd, rowIds, handleAddPart } = useDragAndDrop({
    questionId: question._id,
    parts,
  })

  const partType = getMultiPartTypeConfig(question.type)?.partType
  const isPointScale = partType ? !!getPointScaleCount(partType) : false

  if (isPointScale && partType) {
    return (
      <MultiPartPointScaleGrid
        question={question}
        partType={partType}
        lang={lang}
        langDefault={langDefault}
      />
    )
  }

  return (
    <div className="pb-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          {parts.map((part, i) => (
            <MultiPartRow
              key={part._id}
              entityId={part._id}
              labelL10n={part.text}
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
      </DndContext>
      <div className="p-1 pt-2">
        <Button variant="outline" size="sm" onClick={handleAddPart}>
          + Part
        </Button>
      </div>
    </div>
  )
}

export const MultiPartEdit = React.memo(
  MultiPartEditComponent,
  (prev, next) =>
    prev.question._id === next.question._id &&
    prev.question === next.question &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault,
)
