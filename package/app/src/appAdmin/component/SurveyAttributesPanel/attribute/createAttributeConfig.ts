import {
  getAttributeMeta,
  getNestedValue,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_CONTENT,
  SURVEY_ENTITY_TYPE_TITLE,
  SURVEY_ENTITY_TYPE_THANK_YOU,
  CONTENT_TYPE_TEXT,
} from 'veysur-common'

import {
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from 'appAdmin/component/SurveyEditor'
import type { AttributeConfig } from '../attributesConfig'
import { attributeComponentMap } from './componentMapping'

/**
 * Pattern A: Simple question attribute (most common)
 * Uses setQuestionAttribute for attribute updates
 */
export function createQuestionAttributeConfig(
  attributeId: string,
): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations, surveyFocus) => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT) {
        operations?.setQuestionAttribute(
          surveyFocus?.id || '',
          attributeId,
          value,
        )
      }
    },
  }
}

/**
 * Pattern B: Question type attribute (special case)
 * Uses updateQuestion to trigger type transitions
 */
export function createQuestionTypeConfig(attributeId: string): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations, surveyFocus) => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT) {
        operations?.updateQuestion(surveyFocus?.id || '', {
          [attributeId]: value,
        })
      }
    },
  }
}

/**
 * Pattern C: Multi-entity code attribute
 * Handles code updates for questions, groups, answer options, and subquestions
 */
export function createEntityCodeConfig(attributeId: string): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations, surveyFocus) => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT) {
        operations?.updateQuestion(surveyFocus?.id || '', {
          [attributeId]: value,
        })
      }
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SECTION) {
        operations?.updateSection(surveyFocus?.id || '', {
          [attributeId]: value,
        })
      }
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ANSWER_OPTION) {
        operations?.updateAnswerOption(
          surveyFocus?.parentId || '',
          surveyFocus?.id || '',
          { [attributeId]: value },
        )
      }
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SUBQUESTION) {
        operations?.updateSubquestion(
          surveyFocus?.parentId || '',
          surveyFocus?.id || '',
          { [attributeId]: value },
        )
      }
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_CONTENT) {
        operations?.updateContentCode(surveyFocus?.id || '', value)
      }
    },
  }
}

/**
 * Pattern C2: Content-element type attribute
 * Opens `ContentTypeModal` and routes the choice through `updateContentType`.
 * Built inline rather than from `getAttributeMeta` — the question-type meta
 * already owns the `'type'` id, so content type carries its own app-layer id.
 */
export function createContentTypeConfig(attributeId: string): AttributeConfig {
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    id: attributeId,
    name: 'Type',
    description: 'Type of content element',
    typesLimit: [],
    entityTypes: [SURVEY_ENTITY_TYPE_CONTENT],
    initialValue: CONTENT_TYPE_TEXT,
    isEntityProp: true,
    getValue: (entity) => getNestedValue(entity, 'type') ?? CONTENT_TYPE_TEXT,
    component,
    onChange: (value, operations, surveyFocus) => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_CONTENT) {
        operations?.updateContentType(surveyFocus?.id || '', value)
      }
    },
  }
}

/**
 * Pattern D: Survey title attribute
 * Uses updateSurveyTitle with language parameter
 */
export function createSurveyTitleConfig(attributeId: string): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations, surveyFocus, langEditing = 'en') => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_TITLE) {
        operations?.updateSurveyTitle(value, langEditing)
      }
    },
  }
}

/**
 * Pattern D2: Survey thank you link attributes (End URL / Link text)
 * Uses updateSurveyThankYouLinkUrl / updateSurveyThankYouLinkText with language parameter
 */
export function createSurveyThankYouLinkConfig(
  attributeId: string,
  field: 'url' | 'text',
): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations, surveyFocus, langEditing = 'en') => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_THANK_YOU) {
        if (field === 'url') {
          operations?.updateSurveyThankYouLinkUrl(value, langEditing)
        } else {
          operations?.updateSurveyThankYouLinkText(value, langEditing)
        }
      }
    },
  }
}

/**
 * Pattern E: Survey presentation attributes
 * Uses updateSurveyPresentationSetting with specific setting name
 */
export function createSurveyPresentationConfig(
  attributeId: string,
  settingName: 'title' | 'welcomeMessage' | 'thankYouLink' | 'redirectEnd',
): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations) => {
      // Handle null value (user selected "Default")
      if (value === null) {
        operations?.updateSurveyPresentationSetting(settingName, null)
      } else {
        operations?.updateSurveyPresentationSetting(settingName, value === true)
      }
    },
    getDefaultValue: (defaults) => {
      return defaults.presentation?.[settingName]
    },
  }
}

/**
 * Pattern H: Question/subquestion attribute
 * Handles attribute updates for both questions and subquestions
 */
export function createQuestionOrSubquestionAttributeConfig(
  attributeId: string,
): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations, surveyFocus) => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT) {
        operations?.setQuestionAttribute(
          surveyFocus?.id || '',
          attributeId,
          value,
        )
      }
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SUBQUESTION) {
        operations?.setSubquestionAttribute(
          surveyFocus?.parentId || '',
          surveyFocus?.id || '',
          attributeId,
          value,
        )
      }
    },
  }
}

/**
 * Pattern F: Condition attribute
 * Handles condition updates for questions and groups
 */
export function createConditionConfig(attributeId: string): AttributeConfig {
  const metadata = getAttributeMeta(attributeId)!
  const component =
    attributeComponentMap[attributeId as keyof typeof attributeComponentMap]

  return {
    ...metadata,
    component,
    onChange: (value, operations, surveyFocus) => {
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT) {
        operations?.updateQuestion(surveyFocus?.id || '', { condition: value })
      }
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SECTION) {
        operations?.updateSection(surveyFocus?.id || '', {
          condition: value,
        })
      }
    },
  }
}
