import React from 'react'
import {
  QUESTION_TYPE_TEXT,
  QUESTION_TYPE_NUMBER,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
  QUESTION_TYPE_YES_NO,
  QUESTION_TYPE_STAR_RATING,
  QUESTION_TYPE_POINT_5,
  QUESTION_TYPE_POINT_10,
  QUESTION_TYPE_SURVEY_LANG_SELECT,
  QUESTION_TYPE_DATE,
  QUESTION_TYPE_TIME,
  QUESTION_TYPE_DATETIME,
  QUESTION_TYPE_MATRIX_COMPOSITE,
  QUESTION_TYPE_MATRIX_TEXT,
  QUESTION_TYPE_MATRIX_NUMBER,
  QUESTION_TYPE_MATRIX_DATE,
  QUESTION_TYPE_MATRIX_TIME,
  QUESTION_TYPE_MATRIX_DATETIME,
  QUESTION_TYPE_MATRIX_CHECKBOX,
  QUESTION_TYPE_MATRIX_YES_NO,
  QUESTION_TYPE_RANKING,
  QUESTION_TYPE_MULTI_PART_TEXT,
  QUESTION_TYPE_MULTI_PART_NUMBER,
  QUESTION_TYPE_MULTI_PART_YES_NO,
  QUESTION_TYPE_MULTI_PART_STAR_RATING,
  QUESTION_TYPE_MULTI_PART_POINT_5,
  QUESTION_TYPE_MULTI_PART_POINT_10,
} from 'veysur-common'

import { QuestionTypeText } from 'component/SurveyQuestionType/QuestionTypeText'
import { QuestionTypeNumber } from 'component/SurveyQuestionType/QuestionTypeNumber'
import { QuestionTypeSurveyLangSelect } from 'component/SurveyQuestionType/QuestionTypeSurveyLangSelect'
import { QuestionTypeDate } from 'component/SurveyQuestionType/QuestionTypeDate'
import { QuestionTypeTime } from 'component/SurveyQuestionType/QuestionTypeTime'
import { QuestionTypeDateTime } from 'component/SurveyQuestionType/QuestionTypeDateTime'
import type { QuestionTypeProps } from 'component/SurveyQuestionType/QuestionTypeProps'
import {
  MultipleChoiceEdit,
  MatrixEdit,
  MultiPartEdit,
  RankingEdit,
} from './QuestionTypeEdit'

const questionTypeEditRegistry: Partial<
  Record<string, React.FC<QuestionTypeProps>>
> = {
  [QUESTION_TYPE_TEXT]: QuestionTypeText,
  [QUESTION_TYPE_NUMBER]: QuestionTypeNumber,
  [QUESTION_TYPE_CHECKBOX]: MultipleChoiceEdit,
  [QUESTION_TYPE_DROPDOWN]: MultipleChoiceEdit,
  [QUESTION_TYPE_BUTTON]: MultipleChoiceEdit,
  [QUESTION_TYPE_IMAGE_SELECT]: MultipleChoiceEdit,
  [QUESTION_TYPE_YES_NO]: MultipleChoiceEdit,
  [QUESTION_TYPE_STAR_RATING]: MultipleChoiceEdit,
  [QUESTION_TYPE_POINT_5]: MultipleChoiceEdit,
  [QUESTION_TYPE_POINT_10]: MultipleChoiceEdit,
  [QUESTION_TYPE_SURVEY_LANG_SELECT]: QuestionTypeSurveyLangSelect,
  [QUESTION_TYPE_DATE]: QuestionTypeDate,
  [QUESTION_TYPE_TIME]: QuestionTypeTime,
  [QUESTION_TYPE_DATETIME]: QuestionTypeDateTime,
  [QUESTION_TYPE_MATRIX_COMPOSITE]: MatrixEdit,
  [QUESTION_TYPE_MATRIX_TEXT]: MatrixEdit,
  [QUESTION_TYPE_MATRIX_NUMBER]: MatrixEdit,
  [QUESTION_TYPE_MATRIX_DATE]: MatrixEdit,
  [QUESTION_TYPE_MATRIX_TIME]: MatrixEdit,
  [QUESTION_TYPE_MATRIX_DATETIME]: MatrixEdit,
  [QUESTION_TYPE_MATRIX_CHECKBOX]: MatrixEdit,
  [QUESTION_TYPE_MATRIX_YES_NO]: MatrixEdit,
  [QUESTION_TYPE_RANKING]: RankingEdit,
  [QUESTION_TYPE_MULTI_PART_TEXT]: MultiPartEdit,
  [QUESTION_TYPE_MULTI_PART_NUMBER]: MultiPartEdit,
  [QUESTION_TYPE_MULTI_PART_YES_NO]: MultiPartEdit,
  [QUESTION_TYPE_MULTI_PART_STAR_RATING]: MultiPartEdit,
  [QUESTION_TYPE_MULTI_PART_POINT_5]: MultiPartEdit,
  [QUESTION_TYPE_MULTI_PART_POINT_10]: MultiPartEdit,
}

export const getQuestionTypeEditByName = (
  name: string,
): React.FC<QuestionTypeProps> | undefined => {
  return questionTypeEditRegistry[name]
}
