import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_NUMBER,
} from '../types'
import { ATTRIBUTE_QUESTION_NUMBER_MIN_MAX } from '../constants'
import { getNestedValue, validateMaxNotLessThanMin } from '../helpers'

export const questionNumberMinMaxMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_NUMBER_MIN_MAX,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Number Min/Max',
  description: 'Minimum and maximum number values',
  typesLimit: [QUESTION_TYPE_NUMBER],
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
          validator: validateMaxNotLessThanMin('Number Min/Max'),
        },
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(
        entity,
        `attributes.${ATTRIBUTE_QUESTION_NUMBER_MIN_MAX}`,
      ) || { min: 0, max: 0 }
    )
  },
}
