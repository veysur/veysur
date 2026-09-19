/**
 * Centralized attribute configuration using factory pattern
 * This eliminates ~350 lines of boilerplate across 13 individual files
 */
import {
  ATTRIBUTE_SURVEY_TITLE,
  ATTRIBUTE_SURVEY_PRESENTATION_TITLE,
  ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW,
  ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END,
  ATTRIBUTE_ENTITY_CODE,
  ATTRIBUTE_QUESTION_TYPE,
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  ATTRIBUTE_CHOICE_MIN_MAX,
  ATTRIBUTE_CHOICE_OTHER,
  ATTRIBUTE_CHOICE_RANDOMISE,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
  ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
  ATTRIBUTE_CONDITION,
  ATTRIBUTE_MATRIX_ORIENTATION,
  ATTRIBUTE_QUESTION_COLUMNS,
} from 'veysur-common'

import { ATTRIBUTE_CONTENT_TYPE } from '../constant'
import {
  createQuestionAttributeConfig,
  createQuestionTypeConfig,
  createContentTypeConfig,
  createEntityCodeConfig,
  createSurveyTitleConfig,
  createSurveyThankYouLinkConfig,
  createSurveyPresentationConfig,
  createConditionConfig,
  createQuestionOrSubquestionAttributeConfig,
} from './createAttributeConfig'

// Re-export attribute ID constants for backward compatibility
export {
  ATTRIBUTE_SURVEY_TITLE,
  ATTRIBUTE_SURVEY_PRESENTATION_TITLE,
  ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW,
  ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END,
  ATTRIBUTE_ENTITY_CODE,
  ATTRIBUTE_QUESTION_TYPE,
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  ATTRIBUTE_CHOICE_MIN_MAX,
  ATTRIBUTE_CHOICE_OTHER,
  ATTRIBUTE_CHOICE_RANDOMISE,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
  ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
  ATTRIBUTE_CONDITION,
  ATTRIBUTE_MATRIX_ORIENTATION,
  ATTRIBUTE_QUESTION_COLUMNS,
}

// Generate all configs using factory functions
export const surveyTitleConfig = createSurveyTitleConfig(ATTRIBUTE_SURVEY_TITLE)
export const surveyPresentationTitleConfig = createSurveyPresentationConfig(
  ATTRIBUTE_SURVEY_PRESENTATION_TITLE,
  'title',
)
export const surveyPresentationWelcomeMessageConfig =
  createSurveyPresentationConfig(
    ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE,
    'welcomeMessage',
  )
export const surveyThankYouLinkUrlConfig = createSurveyThankYouLinkConfig(
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL,
  'url',
)
export const surveyThankYouLinkTextConfig = createSurveyThankYouLinkConfig(
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT,
  'text',
)
export const surveyThankYouLinkShowConfig = createSurveyPresentationConfig(
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW,
  'thankYouLink',
)
export const surveyThankYouRedirectEndConfig = createSurveyPresentationConfig(
  ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END,
  'redirectEnd',
)
export const entityCodeConfig = createEntityCodeConfig(ATTRIBUTE_ENTITY_CODE)
export const questionTypeConfig = createQuestionTypeConfig(
  ATTRIBUTE_QUESTION_TYPE,
)
export const contentTypeConfig = createContentTypeConfig(ATTRIBUTE_CONTENT_TYPE)
export const questionRequiredConfig =
  createQuestionOrSubquestionAttributeConfig(ATTRIBUTE_QUESTION_REQUIRED)
export const questionInputSizeConfig = createQuestionAttributeConfig(
  ATTRIBUTE_QUESTION_INPUT_SIZE,
)
export const questionLengthMinMaxConfig = createQuestionAttributeConfig(
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
)
export const choiceMinMaxConfig = createQuestionOrSubquestionAttributeConfig(
  ATTRIBUTE_CHOICE_MIN_MAX,
)
export const choiceOtherConfig = createQuestionAttributeConfig(
  ATTRIBUTE_CHOICE_OTHER,
)
export const choiceRandomiseConfig = createQuestionAttributeConfig(
  ATTRIBUTE_CHOICE_RANDOMISE,
)
export const questionNumberMinMaxConfig = createQuestionAttributeConfig(
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
)
export const questionNumberNegAllowedConfig = createQuestionAttributeConfig(
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
)
export const conditionConfig = createConditionConfig(ATTRIBUTE_CONDITION)
export const matrixOrientationConfig = createQuestionAttributeConfig(
  ATTRIBUTE_MATRIX_ORIENTATION,
)
export const columnsConfig = createQuestionAttributeConfig(
  ATTRIBUTE_QUESTION_COLUMNS,
)
