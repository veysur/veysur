import React from 'react'

import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { FieldError } from 'component/Form'
import { POINT_SCALE_LAYOUT } from 'component/SurveyQuestionType/MultipleChoice/ratingScaleLabels'
import { usePointScaleLabelHandler } from '../PointScaleEdit/usePointScaleLabelHandler'

interface MultiPartPointScaleHeaderProps {
  questionId: string
  partType: string
  answerId: string
  index: number
  label: string
  lang: string
  langDefault: string
  errors?: string[]
}

const stripHtml = (html: string): string => html.replace(/<[^>]*>/g, '').trim()

/**
 * A single point-label column header in the point-scale Multi-Part grid —
 * the column-header sibling of `PointScaleLabelEdit`'s stacked rows. Point
 * count/order is fixed by the question type (see `PointScaleLabelEdit`), so
 * unlike `MatrixColumnHeader` there is no drag handle, delete, or move nav.
 *
 * The point number itself isn't repeated here — each row's numbered control
 * (`MultiPartPointScaleRow`) already shows it under this column, so the
 * header only needs the optional label. The label wraps within the column's
 * fixed width, matching `MatrixColumnHeader`'s behaviour.
 */
const MultiPartPointScaleHeaderComponent: React.FC<
  MultiPartPointScaleHeaderProps
> = ({ questionId, partType, answerId, label, langDefault, errors }) => {
  const updateLabel = usePointScaleLabelHandler(questionId, langDefault)
  const handleTextChange = (text: string) => updateLabel(answerId, text)

  const { columnWidth } = POINT_SCALE_LAYOUT[partType] ?? {}
  const plainTextLabel = stripHtml(label)

  return (
    <th
      className="p-1 align-top border-b-1"
      style={{ width: columnWidth }}
      title={plainTextLabel || undefined}
    >
      <ContentEditor
        value={label}
        variant="inline"
        placeholder="Label"
        withToolbar={false}
        onChange={handleTextChange}
        className="text-muted-foreground text-center text-xs"
      />
      <FieldError errors={errors} />
    </th>
  )
}

export const MultiPartPointScaleHeader = React.memo(
  MultiPartPointScaleHeaderComponent,
  (prev, next) =>
    prev.questionId === next.questionId &&
    prev.partType === next.partType &&
    prev.answerId === next.answerId &&
    prev.index === next.index &&
    prev.label === next.label &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault &&
    (prev.errors?.join('|') ?? '') === (next.errors?.join('|') ?? ''),
)
