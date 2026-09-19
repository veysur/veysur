/**
 * Attribute ID constants
 */
// Survey attributes
export const ATTRIBUTE_SURVEY_TITLE = 'title'
export const ATTRIBUTE_SURVEY_PRESENTATION_TITLE = 'presentation.title'
export const ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE =
  'presentation.welcomeMessage'
export const ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL = 'thankYou.link.url'
export const ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT = 'thankYou.link.text'
export const ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW = 'presentation.thankYouLink'
export const ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END =
  'presentation.redirectEnd'

// Entity attributes (for groups and questions)
export const ATTRIBUTE_ENTITY_CODE = 'code'

// Question attributes
export const ATTRIBUTE_QUESTION_TYPE = 'type'
export const ATTRIBUTE_QUESTION_REQUIRED = 'required'
export const ATTRIBUTE_QUESTION_INPUT_SIZE = 'inputSize'
export const ATTRIBUTE_QUESTION_LENGTH_MIN_MAX = 'lengthMinMax'
export const ATTRIBUTE_CHOICE_MIN_MAX = 'choiceMinMax'
export const ATTRIBUTE_CHOICE_OTHER = 'choiceOther'
export const ATTRIBUTE_CHOICE_RANDOMISE = 'choiceRandomise'
export const CHOICE_OTHER_CODE = 'OTHER'
export const CHOICE_OTHER_VALUE_KEY = 'OTHER_VALUE'
export const RANKING_ORDER_KEY = 'ORDER'

export const ATTRIBUTE_QUESTION_NUMBER_MIN_MAX = 'numberMinMax'
export const ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED = 'numberNegAllowed'

// Condition attribute (for groups and questions)
export const ATTRIBUTE_CONDITION = 'condition'

// Matrix attributes
export const ATTRIBUTE_MATRIX_ORIENTATION = 'matrixOrientation'

// Columns attribute (for image select and future types)
export const ATTRIBUTE_QUESTION_COLUMNS = 'columns'
export const ATTRIBUTE_COLUMNS_COUNT_1 = 1
export const ATTRIBUTE_COLUMNS_COUNT_2 = 2
export const ATTRIBUTE_COLUMNS_COUNT_3 = 3

/**
 * Matrix orientation constants
 */
export const MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS = 'a'
export const MATRIX_ORIENTATION_SUBQUESTIONS_ROWS = 'b'

/**
 * Input size constants
 */
export const ATTRIBUTE_TEXT_INPUT_SIZE_SMALL = 'small'
export const ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM = 'medium'
export const ATTRIBUTE_TEXT_INPUT_SIZE_LARGE = 'large'
