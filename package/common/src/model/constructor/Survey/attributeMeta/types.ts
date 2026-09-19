import { Survey, SurveyEntity } from '../../Survey'
import { SchemaSpec } from 'mzen-schema'

/**
 * Survey entity type constants
 * These represent the different types of entities that can have attributes
 */
export const SURVEY_ENTITY_TYPE_SURVEY = 'survey'
export const SURVEY_ENTITY_TYPE_NAME = 'name'
export const SURVEY_ENTITY_TYPE_TITLE = 'title'
export const SURVEY_ENTITY_TYPE_WELCOME = 'welcome'
export const SURVEY_ENTITY_TYPE_SECTION = 'section'
export const SURVEY_ENTITY_TYPE_ELEMENT = 'element'
export const SURVEY_ENTITY_TYPE_THANK_YOU = 'thankYou'
export const SURVEY_ENTITY_TYPE_ANSWER_OPTION = 'answerOption'
export const SURVEY_ENTITY_TYPE_SUBQUESTION = 'subquestion'
export const SURVEY_ENTITY_TYPE_CONTENT = 'content'

export type SurveyEntityType =
  | typeof SURVEY_ENTITY_TYPE_SURVEY
  | typeof SURVEY_ENTITY_TYPE_NAME
  | typeof SURVEY_ENTITY_TYPE_TITLE
  | typeof SURVEY_ENTITY_TYPE_WELCOME
  | typeof SURVEY_ENTITY_TYPE_SECTION
  | typeof SURVEY_ENTITY_TYPE_ELEMENT
  | typeof SURVEY_ENTITY_TYPE_THANK_YOU
  | typeof SURVEY_ENTITY_TYPE_ANSWER_OPTION
  | typeof SURVEY_ENTITY_TYPE_SUBQUESTION
  | typeof SURVEY_ENTITY_TYPE_CONTENT

/**
 * Question type constants
 * This is the single source of truth for question types in the system
 */
export const QUESTION_TYPE_TEXT = 'text'
export const QUESTION_TYPE_NUMBER = 'number'
export const QUESTION_TYPE_CHECKBOX = 'checkbox'
export const QUESTION_TYPE_DROPDOWN = 'dropdown'
export const QUESTION_TYPE_BUTTON = 'button'
export const QUESTION_TYPE_IMAGE_SELECT = 'imageSelect'
export const QUESTION_TYPE_YES_NO = 'yesNo'
export const QUESTION_TYPE_STAR_RATING = 'starRating'
export const QUESTION_TYPE_POINT_5 = 'point5'
export const QUESTION_TYPE_POINT_10 = 'point10'
export const QUESTION_TYPE_SURVEY_LANG_SELECT = 'surveyLangSelect'
export const QUESTION_TYPE_DATE = 'date'
export const QUESTION_TYPE_TIME = 'time'
export const QUESTION_TYPE_DATETIME = 'dateTime'
export const QUESTION_TYPE_MATRIX_COMPOSITE = 'matrixComposite'
export const QUESTION_TYPE_MATRIX_TEXT = 'matrixText'
export const QUESTION_TYPE_MATRIX_NUMBER = 'matrixNumber'
export const QUESTION_TYPE_MATRIX_DATE = 'matrixDate'
export const QUESTION_TYPE_MATRIX_TIME = 'matrixTime'
export const QUESTION_TYPE_MATRIX_DATETIME = 'matrixDateTime'
export const QUESTION_TYPE_MATRIX_CHECKBOX = 'matrixCheckbox'
export const QUESTION_TYPE_MATRIX_YES_NO = 'matrixYesNo'
export const QUESTION_TYPE_RANKING = 'ranking'
export const QUESTION_TYPE_MULTI_PART_TEXT = 'multiPartText'
export const QUESTION_TYPE_MULTI_PART_NUMBER = 'multiPartNumber'
export const QUESTION_TYPE_MULTI_PART_YES_NO = 'multiPartYesNo'
export const QUESTION_TYPE_MULTI_PART_STAR_RATING = 'multiPartStarRating'
export const QUESTION_TYPE_MULTI_PART_POINT_5 = 'multiPartPoint5'
export const QUESTION_TYPE_MULTI_PART_POINT_10 = 'multiPartPoint10'

/**
 * Union type of all valid question types
 * This is re-exported from Survey.ts for backward compatibility
 *
 * Adding a new question type? If it has selectable answer options, check
 * whether they should be condition-addressable — see
 * package/common/src/model/service/SurveyCondition/answerOptionReferenceability.ts
 */
export type QuestionType =
  | typeof QUESTION_TYPE_TEXT
  | typeof QUESTION_TYPE_NUMBER
  | typeof QUESTION_TYPE_CHECKBOX
  | typeof QUESTION_TYPE_DROPDOWN
  | typeof QUESTION_TYPE_BUTTON
  | typeof QUESTION_TYPE_IMAGE_SELECT
  | typeof QUESTION_TYPE_YES_NO
  | typeof QUESTION_TYPE_STAR_RATING
  | typeof QUESTION_TYPE_POINT_5
  | typeof QUESTION_TYPE_POINT_10
  | typeof QUESTION_TYPE_SURVEY_LANG_SELECT
  | typeof QUESTION_TYPE_DATE
  | typeof QUESTION_TYPE_TIME
  | typeof QUESTION_TYPE_DATETIME
  | typeof QUESTION_TYPE_MATRIX_COMPOSITE
  | typeof QUESTION_TYPE_MATRIX_TEXT
  | typeof QUESTION_TYPE_MATRIX_NUMBER
  | typeof QUESTION_TYPE_MATRIX_DATE
  | typeof QUESTION_TYPE_MATRIX_TIME
  | typeof QUESTION_TYPE_MATRIX_DATETIME
  | typeof QUESTION_TYPE_MATRIX_CHECKBOX
  | typeof QUESTION_TYPE_MATRIX_YES_NO
  | typeof QUESTION_TYPE_RANKING
  | typeof QUESTION_TYPE_MULTI_PART_TEXT
  | typeof QUESTION_TYPE_MULTI_PART_NUMBER
  | typeof QUESTION_TYPE_MULTI_PART_YES_NO
  | typeof QUESTION_TYPE_MULTI_PART_STAR_RATING
  | typeof QUESTION_TYPE_MULTI_PART_POINT_5
  | typeof QUESTION_TYPE_MULTI_PART_POINT_10
  | string

/**
 * Value stored for a single survey attribute. Attribute values are
 * heterogeneous by design (string, number, boolean, or a small config
 * object) depending on the attribute definition.
 */
export type AttributeValue = unknown

/**
 * Shape shared by the min/max-style attributes (choiceMinMax,
 * questionLengthMinMax, questionNumberMinMax).
 */
export interface MinMax {
  min: number
  max: number
}

/**
 * A survey entity's attributes bag, keyed by attribute id.
 *
 * The entity-level attributes (questions, subquestions, sections) are declared
 * with their real shapes so consumers reach `attributes.choiceMinMax` etc.
 * without an `as MinMax` cast. Survey-level attributes use dotted keys
 * (`presentation.title`, `thankYou.link.url`) and are reached through the index
 * signature. Flag attributes are stored as `0 | 1` by the model but older rows
 * and some callers use booleans, hence the widened flag type.
 */
export type AttributeFlag = 0 | 1 | boolean

export interface SurveyAttributes {
  /** ATTRIBUTE_QUESTION_REQUIRED */
  required?: AttributeFlag
  /** ATTRIBUTE_QUESTION_INPUT_SIZE */
  inputSize?: string
  /** ATTRIBUTE_QUESTION_LENGTH_MIN_MAX */
  lengthMinMax?: MinMax
  /** ATTRIBUTE_CHOICE_MIN_MAX */
  choiceMinMax?: MinMax
  /** ATTRIBUTE_CHOICE_OTHER */
  choiceOther?: AttributeFlag
  /** ATTRIBUTE_CHOICE_RANDOMISE */
  choiceRandomise?: AttributeFlag
  /** ATTRIBUTE_QUESTION_NUMBER_MIN_MAX */
  numberMinMax?: MinMax
  /** ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED */
  numberNegAllowed?: AttributeFlag
  /** ATTRIBUTE_MATRIX_ORIENTATION */
  matrixOrientation?: string
  /** choice display format (e.g. point-scale rendering) */
  choiceFormat?: string
  /** ATTRIBUTE_QUESTION_COLUMNS */
  columns?: number
  [key: string]: AttributeValue
}

/**
 * Core metadata for a survey attribute
 * This defines the core business logic for attributes (defaults, type restrictions, validation)
 * UI-specific logic (components, change handlers) lives in the app layer
 */
export type AttributeMeta = {
  /** Unique identifier for the attribute */
  id: string
  /** Default value for the attribute */
  initialValue: AttributeValue
  /** Override default value when the attribute is used on a subquestion */
  subquestionInitialValue?: AttributeValue
  /** Question types this attribute applies to (empty array = all types) */
  typesLimit: QuestionType[]
  /** Entity types this attribute applies to */
  entityTypes: SurveyEntityType[]
  /** Human-readable name */
  name: string
  /** Description for UI/docs */
  description: string
  /** Options for select/radio inputs */
  options?: { [key: string]: string }
  /** Schema specification for validation */
  schemaSpec?: SchemaSpec
  /** Dynamic validation (e.g., for uniqueness checks that depend on survey state) */
  getSchemaSpec?: (entity: SurveyEntity, survey: Survey) => SchemaSpec
  /** Function to get the attribute value from an entity */
  getValue: (entity: SurveyEntity, langEditing?: string) => AttributeValue
  /** If true, this attribute maps to an entity property, not the attributes object */
  isEntityProp?: boolean
}
