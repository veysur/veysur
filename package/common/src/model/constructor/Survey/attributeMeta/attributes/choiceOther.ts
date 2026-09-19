import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  QUESTION_TYPE_CHECKBOX,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_BUTTON,
  QUESTION_TYPE_IMAGE_SELECT,
} from '../types'
import { ATTRIBUTE_CHOICE_OTHER } from '../constants'
import { getNestedValue } from '../helpers'

export const choiceOtherMeta: AttributeMeta = {
  id: ATTRIBUTE_CHOICE_OTHER,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT],
  name: 'Other',
  description: 'Allow a custom "Other" option with free-text entry',
  typesLimit: [
    QUESTION_TYPE_CHECKBOX,
    QUESTION_TYPE_DROPDOWN,
    QUESTION_TYPE_BUTTON,
    QUESTION_TYPE_IMAGE_SELECT,
  ],
  initialValue: false,
  schemaSpec: {
    $type: Boolean,
    $name: 'Other',
    $validate: {
      required: true,
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(entity, `attributes.${ATTRIBUTE_CHOICE_OTHER}`) || false
    )
  },
}
