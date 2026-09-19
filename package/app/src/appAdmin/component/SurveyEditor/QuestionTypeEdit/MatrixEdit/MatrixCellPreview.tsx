import React from 'react'
import {
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_YES_NO,
  SurveyQuestion,
} from 'veysur-common'

import { Checkbox } from 'component/shadcn/checkbox'
import { Input } from 'component/shadcn/input'
import { QuestionTypeDate } from 'component/SurveyQuestionType/QuestionTypeDate'
import { QuestionTypeTime } from 'component/SurveyQuestionType/QuestionTypeTime'
import { QuestionTypeDateTime } from 'component/SurveyQuestionType/QuestionTypeDateTime'
import { MultipleChoiceYesNo } from 'component/SurveyQuestionType/MultipleChoice'

// Null question used for preview cells — date/time/yesNo components don't read it
const nullQuestion = null as unknown as SurveyQuestion

interface MatrixCellPreviewProps {
  cellType: string
}

export const MatrixCellPreview: React.FC<MatrixCellPreviewProps> = ({
  cellType,
}) => {
  if (cellType === QUESTION_TYPE_NUMBER) {
    return (
      <div className="pointer-events-none">
        <Input type="number" disabled />
      </div>
    )
  }
  if (cellType === QUESTION_TYPE_DATE) {
    return (
      <div className="pointer-events-none flex justify-center">
        <QuestionTypeDate question={nullQuestion} lang="en" langDefault="en" />
      </div>
    )
  }
  if (cellType === QUESTION_TYPE_TIME) {
    return (
      <div className="pointer-events-none flex justify-center">
        <QuestionTypeTime question={nullQuestion} lang="en" langDefault="en" />
      </div>
    )
  }
  if (cellType === QUESTION_TYPE_DATETIME) {
    return (
      <div className="pointer-events-none flex justify-center">
        <QuestionTypeDateTime
          question={nullQuestion}
          lang="en"
          langDefault="en"
        />
      </div>
    )
  }
  if (cellType === QUESTION_TYPE_CHECKBOX) {
    return (
      <div className="pointer-events-none flex justify-center">
        <Checkbox disabled />
      </div>
    )
  }
  if (cellType === QUESTION_TYPE_YES_NO) {
    return (
      <div className="pointer-events-none flex justify-center">
        <MultipleChoiceYesNo
          question={nullQuestion}
          lang="en"
          langDefault="en"
        />
      </div>
    )
  }
  return (
    <div className="pointer-events-none">
      <Input type="text" disabled />
    </div>
  )
}
