import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
} from '../types'
import { ATTRIBUTE_QUESTION_REQUIRED } from '../constants'
import { getNestedValue } from '../helpers'

export const questionRequiredMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_REQUIRED,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Required',
  description: 'Answer required',
  typesLimit: [],
  initialValue: true,
  subquestionInitialValue: false,
  schemaSpec: {
    $type: Boolean,
    $name: 'Required',
    $validate: {
      required: true,
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(entity, `attributes.${ATTRIBUTE_QUESTION_REQUIRED}`) || ''
    )
  },
}
