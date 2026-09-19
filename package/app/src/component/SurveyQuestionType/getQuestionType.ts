import { lazy } from 'react'

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

const questionTypeRegistry = {
  [QUESTION_TYPE_TEXT]: lazy(() =>
    import('./QuestionTypeText').then((m) => ({ default: m.QuestionTypeText })),
  ),
  [QUESTION_TYPE_NUMBER]: lazy(() =>
    import('./QuestionTypeNumber').then((m) => ({
      default: m.QuestionTypeNumber,
    })),
  ),
  [QUESTION_TYPE_CHECKBOX]: lazy(() =>
    import('./MultipleChoice/MultipleChoiceCheckbox').then((m) => ({
      default: m.MultipleChoiceCheckbox,
    })),
  ),
  [QUESTION_TYPE_DROPDOWN]: lazy(() =>
    import('./MultipleChoice/MultipleChoiceDropdown').then((m) => ({
      default: m.MultipleChoiceDropdown,
    })),
  ),
  [QUESTION_TYPE_BUTTON]: lazy(() =>
    import('./MultipleChoice/MultipleChoiceButtons').then((m) => ({
      default: m.MultipleChoiceButtons,
    })),
  ),
  [QUESTION_TYPE_IMAGE_SELECT]: lazy(() =>
    import('./MultipleChoice/MultipleChoiceImage').then((m) => ({
      default: m.MultipleChoiceImage,
    })),
  ),
  [QUESTION_TYPE_YES_NO]: lazy(() =>
    import('./MultipleChoice/MultipleChoiceYesNo').then((m) => ({
      default: m.MultipleChoiceYesNo,
    })),
  ),
  [QUESTION_TYPE_STAR_RATING]: lazy(() =>
    import('./MultipleChoice/MultipleChoiceStarRating').then((m) => ({
      default: m.MultipleChoiceStarRating,
    })),
  ),
  [QUESTION_TYPE_POINT_5]: lazy(() =>
    import('./MultipleChoice/MultipleChoicePoint5').then((m) => ({
      default: m.MultipleChoicePoint5,
    })),
  ),
  [QUESTION_TYPE_POINT_10]: lazy(() =>
    import('./MultipleChoice/MultipleChoicePoint10').then((m) => ({
      default: m.MultipleChoicePoint10,
    })),
  ),
  [QUESTION_TYPE_SURVEY_LANG_SELECT]: lazy(() =>
    import('./QuestionTypeSurveyLangSelect').then((m) => ({
      default: m.QuestionTypeSurveyLangSelect,
    })),
  ),
  [QUESTION_TYPE_DATE]: lazy(() =>
    import('./QuestionTypeDate').then((m) => ({ default: m.QuestionTypeDate })),
  ),
  [QUESTION_TYPE_TIME]: lazy(() =>
    import('./QuestionTypeTime').then((m) => ({ default: m.QuestionTypeTime })),
  ),
  [QUESTION_TYPE_DATETIME]: lazy(() =>
    import('./QuestionTypeDateTime').then((m) => ({
      default: m.QuestionTypeDateTime,
    })),
  ),
  [QUESTION_TYPE_MATRIX_COMPOSITE]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_MATRIX_TEXT]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_MATRIX_NUMBER]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_MATRIX_DATE]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_MATRIX_TIME]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_MATRIX_DATETIME]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_MATRIX_CHECKBOX]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_MATRIX_YES_NO]: lazy(() =>
    import('./QuestionTypeMatrix').then((m) => ({
      default: m.QuestionTypeMatrix,
    })),
  ),
  [QUESTION_TYPE_RANKING]: lazy(() =>
    import('./QuestionTypeRanking/QuestionTypeRanking').then((m) => ({
      default: m.QuestionTypeRanking,
    })),
  ),
  [QUESTION_TYPE_MULTI_PART_TEXT]: lazy(() =>
    import('./QuestionTypeMultiPart').then((m) => ({
      default: m.QuestionTypeMultiPart,
    })),
  ),
  [QUESTION_TYPE_MULTI_PART_NUMBER]: lazy(() =>
    import('./QuestionTypeMultiPart').then((m) => ({
      default: m.QuestionTypeMultiPart,
    })),
  ),
  [QUESTION_TYPE_MULTI_PART_YES_NO]: lazy(() =>
    import('./QuestionTypeMultiPart').then((m) => ({
      default: m.QuestionTypeMultiPart,
    })),
  ),
  [QUESTION_TYPE_MULTI_PART_STAR_RATING]: lazy(() =>
    import('./QuestionTypeMultiPart').then((m) => ({
      default: m.QuestionTypeMultiPart,
    })),
  ),
  [QUESTION_TYPE_MULTI_PART_POINT_5]: lazy(() =>
    import('./QuestionTypeMultiPart').then((m) => ({
      default: m.QuestionTypeMultiPart,
    })),
  ),
  [QUESTION_TYPE_MULTI_PART_POINT_10]: lazy(() =>
    import('./QuestionTypeMultiPart').then((m) => ({
      default: m.QuestionTypeMultiPart,
    })),
  ),
}

export const getQuestionTypeByName = (name: string) => {
  const component =
    questionTypeRegistry[name as keyof typeof questionTypeRegistry]
  if (!component) {
    console.warn(`No component found for question type "${name}"`)
  }
  return component
}

export const getRegisteredQuestionTypes = (): string[] => {
  return Object.keys(questionTypeRegistry)
}
