import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_TEXT,
} from '../types'
import {
  ATTRIBUTE_QUESTION_INPUT_SIZE,
  ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
  ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
} from '../constants'
import { getNestedValue } from '../helpers'

export const questionInputSizeMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_INPUT_SIZE,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Input Size',
  description: 'Size of the text input field',
  typesLimit: [QUESTION_TYPE_TEXT],
  initialValue: ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  options: {
    [ATTRIBUTE_TEXT_INPUT_SIZE_SMALL]: 'Small',
    [ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM]: 'Medium',
    [ATTRIBUTE_TEXT_INPUT_SIZE_LARGE]: 'Large',
  },
  schemaSpec: {
    $type: String,
    $name: 'Input Size',
    $validate: {
      required: true,
      notEmpty: true,
      inArray: {
        values: [
          ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
          ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
          ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
        ],
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(entity, `attributes.${ATTRIBUTE_QUESTION_INPUT_SIZE}`) ||
      ''
    )
  },
}
