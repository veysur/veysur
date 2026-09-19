import React from 'react'

import { ContentEditor } from 'appAdmin/component/ContentEditor'
import { FieldError } from 'component/Form'
import { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'
import { useSurveyEditorStore } from 'appAdmin/component/SurveyEditor'
import { useLabelExpressionErrors } from 'appAdmin/component/SurveyEditor/hook/useLabelExpressionErrors'

import { usePointScaleLabelHandler } from './usePointScaleLabelHandler'

interface PointScaleLabelRowProps {
  index: number
  answerId: string
  label: string
  placeholder: string
  onUpdateText: (text: string) => void
  errors?: string[]
}

const PointScaleLabelRow: React.FC<PointScaleLabelRowProps> = React.memo(
  ({ index, label, placeholder, onUpdateText, errors }) => (
    <div className="flex flex-row items-center gap-2 border-t p-1">
      <div className="text-muted-foreground w-16 flex-shrink-0 text-sm">
        Point {index + 1}
      </div>
      <div className="min-w-0 flex-1 text-base">
        <ContentEditor
          value={label}
          variant="inline"
          placeholder={placeholder}
          withToolbar={false}
          onChange={onUpdateText}
        />
        <FieldError errors={errors} />
      </div>
    </div>
  ),
  (prev, next) =>
    prev.index === next.index &&
    prev.answerId === next.answerId &&
    prev.label === next.label &&
    prev.placeholder === next.placeholder &&
    (prev.errors?.join('|') ?? '') === (next.errors?.join('|') ?? ''),
)
PointScaleLabelRow.displayName = 'PointScaleLabelRow'

/**
 * Label-only editor for the fixed point-scale question types (star rating,
 * 5-point, 10-point) and their Multi-Part variants — every point already has
 * a real, persisted `SurveyAnswerOption` (see
 * `questionType/pointScale.ts#buildPointScaleAnswerOptions`), so this is
 * deliberately much thinner than `MatrixColumnHeader`/`MultiPartRow`: no
 * drag handle, no add/delete/reorder, since the point count is fixed by the
 * question type. Labels are optional captions shown above each point's
 * number in the survey-taking view — leaving a row blank is expected, not
 * an error.
 */
const PointScaleLabelEditComponent: React.FC<QuestionTypeProps> = ({
  question,
  lang,
  langDefault,
}) => {
  const handleUpdateText = usePointScaleLabelHandler(question._id, langDefault)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const getLabelExpressionErrors = useLabelExpressionErrors(question)

  const answerOptions = question.answerOptions || []

  return (
    <div className="pb-2">
      {answerOptions.map((answerOption, index) => (
        <PointScaleLabelRow
          key={answerOption._id}
          index={index}
          answerId={answerOption._id}
          label={answerOption.label.getLang(lang, langDefault)}
          placeholder="Optional label"
          onUpdateText={(text) => handleUpdateText(answerOption._id, text)}
          errors={getLabelExpressionErrors(
            answerOption.label.getLang(langEditing, langDefault),
          )}
        />
      ))}
    </div>
  )
}

export const PointScaleLabelEdit = React.memo(
  PointScaleLabelEditComponent,
  (prev, next) =>
    prev.question._id === next.question._id &&
    prev.question === next.question &&
    prev.lang === next.lang &&
    prev.langDefault === next.langDefault,
)
