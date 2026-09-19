import React, { ChangeEvent, MouseEvent } from 'react'
import {
  QuestionType,
  SurveyEntity,
  AttributeMeta,
  SurveyEntityType,
  SettingSurvey,
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_NAME,
  SURVEY_ENTITY_TYPE_TITLE,
  SURVEY_ENTITY_TYPE_WELCOME,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_CONTENT,
  SURVEY_ENTITY_TYPE_THANK_YOU,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from 'veysur-common'

import {
  createSurveyOperations,
  SurveyFocus,
} from 'appAdmin/component/SurveyEditor'

import { ATTRIBUTE_SET_BASIC, ATTRIBUTE_CONTENT_TYPE } from './constant'
import {
  // Attribute constants
  ATTRIBUTE_SURVEY_PRESENTATION_TITLE,
  ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE,
  ATTRIBUTE_SURVEY_TITLE,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT,
  ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW,
  ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END,
  ATTRIBUTE_ENTITY_CODE,
  ATTRIBUTE_QUESTION_TYPE,
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_QUESTION_REQUIRED,
  ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  ATTRIBUTE_CHOICE_MIN_MAX,
  ATTRIBUTE_CHOICE_OTHER,
  ATTRIBUTE_CHOICE_RANDOMISE,
  ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  ATTRIBUTE_MATRIX_ORIENTATION,
  ATTRIBUTE_QUESTION_COLUMNS,
  ATTRIBUTE_CONDITION,
  // Attribute configurations
  surveyPresentationTitleConfig,
  surveyPresentationWelcomeMessageConfig,
  surveyTitleConfig,
  surveyThankYouLinkUrlConfig,
  surveyThankYouLinkTextConfig,
  surveyThankYouLinkShowConfig,
  surveyThankYouRedirectEndConfig,
  entityCodeConfig,
  questionTypeConfig,
  contentTypeConfig,
  questionRequiredConfig,
  questionInputSizeConfig,
  questionLengthMinMaxConfig,
  choiceMinMaxConfig,
  choiceOtherConfig,
  choiceRandomiseConfig,
  questionNumberMinMaxConfig,
  questionNumberNegAllowedConfig,
  matrixOrientationConfig,
  columnsConfig,
  conditionConfig,
} from './attribute'

export type MouseEventHandler = MouseEvent<HTMLInputElement | HTMLButtonElement>
export type ChangeEventHandler = ChangeEvent<
  HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
>

/**
 * React-specific extension for attribute metadata
 * This adds UI components and change handlers to the core metadata from common
 */
export type AttributeConfigReact = {
  component: React.FC<{
    entity: SurveyEntity
    config: AttributeConfig
    onChange: (value: unknown) => void
    isValid: boolean
    errors?: { [path: string]: string[] }
    // Attribute values are polymorphic by design (string, number, min/max
    // objects, etc.) — each concrete component narrows the shape it expects.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
    hasDefaults?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValue?: any
  }>
  onChange?: (
    // Config authors pass this straight into strongly-typed operation calls
    // (e.g. updateSurveyTitle(value, lang)) without narrowing first.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value?: any,
    operations?: ReturnType<typeof createSurveyOperations>,
    surveyFocus?: SurveyFocus,
    langEditing?: string,
  ) => void
  /** Optional function to get the default value from survey settings */
  getDefaultValue?: (defaults: SettingSurvey) => unknown
}

/**
 * Complete attribute configuration for the app layer
 * Extends core metadata from common with React-specific properties
 */
export type AttributeConfig = AttributeMeta & AttributeConfigReact
export type AttributeSetConfig = {
  entityTypes: SurveyEntityType[]
  id: string
  name: string
  attributeIds: string[]
  attributes?: AttributeConfig[]
}

export const attributeSetsConfig: AttributeSetConfig[] = [
  {
    id: ATTRIBUTE_SET_BASIC,
    entityTypes: [
      SURVEY_ENTITY_TYPE_SURVEY,
      SURVEY_ENTITY_TYPE_NAME,
      SURVEY_ENTITY_TYPE_TITLE,
      SURVEY_ENTITY_TYPE_WELCOME,
      SURVEY_ENTITY_TYPE_SECTION,
      SURVEY_ENTITY_TYPE_ELEMENT,
      SURVEY_ENTITY_TYPE_CONTENT,
      SURVEY_ENTITY_TYPE_THANK_YOU,
      SURVEY_ENTITY_TYPE_ANSWER_OPTION,
      SURVEY_ENTITY_TYPE_SUBQUESTION,
    ],
    name: 'Basic',
    attributeIds: [
      ATTRIBUTE_SURVEY_PRESENTATION_TITLE,
      ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE,
      ATTRIBUTE_SURVEY_TITLE,
      ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL,
      ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT,
      ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW,
      ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END,
      ATTRIBUTE_QUESTION_TYPE,
      ATTRIBUTE_CONTENT_TYPE,
      ATTRIBUTE_ENTITY_CODE,
      ATTRIBUTE_QUESTION_REQUIRED,
      ATTRIBUTE_QUESTION_INPUT_SIZE,
      ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
      ATTRIBUTE_CHOICE_MIN_MAX,
      ATTRIBUTE_CHOICE_OTHER,
      ATTRIBUTE_CHOICE_RANDOMISE,
      ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
      ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
      ATTRIBUTE_MATRIX_ORIENTATION,
      ATTRIBUTE_QUESTION_COLUMNS,
      ATTRIBUTE_CONDITION,
    ],
  },
]

export const attributesConfig: AttributeConfig[] = [
  surveyTitleConfig,
  surveyPresentationTitleConfig,
  surveyPresentationWelcomeMessageConfig,
  surveyThankYouLinkUrlConfig,
  surveyThankYouLinkTextConfig,
  surveyThankYouLinkShowConfig,
  surveyThankYouRedirectEndConfig,
  entityCodeConfig,
  questionTypeConfig,
  contentTypeConfig,
  questionRequiredConfig,
  questionInputSizeConfig,
  questionLengthMinMaxConfig,
  choiceMinMaxConfig,
  choiceOtherConfig,
  choiceRandomiseConfig,
  questionNumberMinMaxConfig,
  questionNumberNegAllowedConfig,
  matrixOrientationConfig,
  columnsConfig,
  conditionConfig,
]

export function getAttributeSets(
  entityType: SurveyEntityType,
): AttributeSetConfig[] {
  return attributeSetsConfig.filter(function (config: AttributeSetConfig) {
    return config.entityTypes.includes(entityType)
  })
}

export function getAttributes(
  attributeIds: AttributeConfig['id'][],
  entityType?: SurveyEntityType,
  questionType?: QuestionType,
): AttributeConfig[] {
  return attributesConfig.filter(function (config: AttributeConfig) {
    return (
      attributeIds.includes(config.id) &&
      (!entityType || config.entityTypes.includes(entityType)) &&
      (!questionType ||
        config.typesLimit.length == 0 ||
        config.typesLimit.includes(questionType))
    )
  })
}
