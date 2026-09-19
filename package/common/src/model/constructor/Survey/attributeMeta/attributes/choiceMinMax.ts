import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
} from '../types'
import { ATTRIBUTE_CHOICE_MIN_MAX } from '../constants'
import { getNestedValue, validateMaxNotLessThanMin } from '../helpers'

export const choiceMinMaxMeta: AttributeMeta = {
  id: ATTRIBUTE_CHOICE_MIN_MAX,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Selection Rules',
  description: 'Minimum and maximum number of choices',
  typesLimit: [
    QUESTION_TYPE_CHECKBOX,
    QUESTION_TYPE_DROPDOWN,
    QUESTION_TYPE_BUTTON,
    QUESTION_TYPE_IMAGE_SELECT,
  ],
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
          validator: validateMaxNotLessThanMin('Selection Rules'),
        },
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(entity, `attributes.${ATTRIBUTE_CHOICE_MIN_MAX}`) || {
        min: 0,
        max: 0,
      }
    )
  },
}
