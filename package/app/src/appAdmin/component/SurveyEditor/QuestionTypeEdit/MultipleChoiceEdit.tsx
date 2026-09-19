import React from 'react'
import {
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
} from 'veysur-common'

import { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'

import { MultipleChoiceTextEdit } from './MultipleChoiceTextEdit/MultipleChoiceTextEdit'
import { PointScaleLabelEdit } from './PointScaleEdit'

// Lazy-loaded admin component
let MultipleChoiceImageEdit: React.FC<QuestionTypeProps> | undefined = undefined

export const MultipleChoiceEdit: React.FC<QuestionTypeProps> = (props) => {
  switch (props.question?.type) {
    case QUESTION_TYPE_CHECKBOX:
    case QUESTION_TYPE_DROPDOWN:
    case QUESTION_TYPE_BUTTON:
      return <MultipleChoiceTextEdit {...props} />
    case QUESTION_TYPE_YES_NO:
      return (
        <div className="text-muted-foreground text-sm p-2">
          Yes/No format uses fixed options. No answer options to edit.
        </div>
      )
    case QUESTION_TYPE_STAR_RATING:
    case QUESTION_TYPE_POINT_5:
    case QUESTION_TYPE_POINT_10:
      return <PointScaleLabelEdit {...props} />
    case QUESTION_TYPE_IMAGE_SELECT:
      // Lazy load from appAdmin
      if (!MultipleChoiceImageEdit) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- synchronous lazy load avoids a circular import with this barrel
        const module = require('appAdmin/component/SurveyEditor/QuestionTypeEdit')
        // eslint-disable-next-line react-hooks/globals -- idempotent assignment (require() always resolves to the same module export), safe under StrictMode's double-invoke
        MultipleChoiceImageEdit = module.MultipleChoiceImageEdit
      }
      return MultipleChoiceImageEdit ? (
        <MultipleChoiceImageEdit {...props} />
      ) : null
    default:
      return null
  }
}
