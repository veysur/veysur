import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_NUMBER,
} from '../types'
import { ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED } from '../constants'
import { getNestedValue } from '../helpers'

export const questionNumberNegAllowedMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Negative Allowed',
  description: 'Allow negative numbers',
  typesLimit: [QUESTION_TYPE_NUMBER],
  initialValue: false,
  schemaSpec: {
    $type: Boolean,
    $name: 'Negative Allowed',
    $validate: {
      required: true,
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(
        entity,
        `attributes.${ATTRIBUTE_QUESTION_NUMBER_NEG_ALLOWED}`,
      ) || false
    )
  },
}
