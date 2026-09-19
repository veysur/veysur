// Import and re-export entity type constants from common
export {
  SURVEY_ENTITY_TYPE_SURVEY,
  SURVEY_ENTITY_TYPE_NAME,
  SURVEY_ENTITY_TYPE_TITLE,
  SURVEY_ENTITY_TYPE_WELCOME,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_THANK_YOU,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  SURVEY_ENTITY_TYPE_CONTENT,
} from 'veysur-common'

// UI-specific constants for DOM element IDs
export const SURVEY_UI_ID_CONTAINER = 'survey-container'
export const SURVEY_UI_ID_TITLE = 'survey-title'
export const SURVEY_UI_ID_WELCOME = 'survey-welcome'
export const SURVEY_UI_ID_THANK_YOU = 'survey-thank-you'

// UI-specific array of survey-level entity types
export const SURVEY_ENTITY_TYPE_SURVEY_TYPES = [
  'survey',
  'name',
  'title',
  'welcome',
  'thankYou',
] as const

// UI-specific ID prefixes for editor focus management
export const QUESTION_GROUP_ID_PREFIX = 'G'
export const QUESTION_ID_PREFIX = 'Q'
export const CONTENT_ID_PREFIX = 'C'
export const ANSWER_OPTION_ID_PREFIX = 'AO'
export const SUBQUESTION_ID_PREFIX = 'SQ'
