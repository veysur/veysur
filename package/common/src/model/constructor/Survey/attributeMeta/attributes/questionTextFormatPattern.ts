import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_TEXT,
} from '../types'
import { ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN } from '../constants'
import { getNestedValue } from '../helpers'
import {
  TEXT_FORMAT_PATTERN_MAX_LENGTH,
  isSafeRegexPattern,
} from 'model/service/TextFormat'

export const questionTextFormatPatternMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Custom Pattern',
  description: 'Regular expression the whole answer must match',
  typesLimit: [QUESTION_TYPE_TEXT],
  initialValue: '',
  schemaSpec: {
    $type: String,
    $name: 'Custom Pattern',
    $validate: {
      callback: {
        validator: (value: unknown) =>
          !value ||
          isSafeRegexPattern(String(value)) ||
          `Enter a valid pattern of at most ${TEXT_FORMAT_PATTERN_MAX_LENGTH} characters, without nested repetition`,
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(
        entity,
        `attributes.${ATTRIBUTE_QUESTION_TEXT_FORMAT_PATTERN}`,
      ) || ''
    )
  },
}
