import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_TEXT,
} from '../types'
import { ATTRIBUTE_QUESTION_LENGTH_MIN_MAX } from '../constants'
import { getNestedValue, validateMaxNotLessThanMin } from '../helpers'

export const questionLengthMinMaxMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_LENGTH_MIN_MAX,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Length Min/Max',
  description: 'Minimum and maximum length for text input',
  typesLimit: [QUESTION_TYPE_TEXT],
  initialValue: {
    min: 0,
    max: 0,
  },
  schemaSpec: {
    min: {
      $type: Number,
      $name: 'Min',
      $validate: { required: true },
    },
    max: {
      $type: Number,
      $name: 'Max',
      $validate: {
        required: true,
        callback: {
          validator: validateMaxNotLessThanMin('Length Min/Max'),
        },
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(
        entity,
        `attributes.${ATTRIBUTE_QUESTION_LENGTH_MIN_MAX}`,
      ) || { min: 0, max: 0 }
    )
  },
}
