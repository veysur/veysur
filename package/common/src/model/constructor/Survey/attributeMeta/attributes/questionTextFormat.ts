import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_TEXT,
} from '../types'
import { ATTRIBUTE_QUESTION_TEXT_FORMAT } from '../constants'
import { getNestedValue } from '../helpers'
import {
  TEXT_FORMATS,
  TEXT_FORMAT_NONE,
  TEXT_FORMAT_EMAIL,
  TEXT_FORMAT_PHONE,
  TEXT_FORMAT_URL,
  TEXT_FORMAT_CUSTOM,
} from 'model/service/TextFormat'

export const questionTextFormatMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_TEXT_FORMAT,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Text Format',
  description: 'Format the answer must match',
  typesLimit: [QUESTION_TYPE_TEXT],
  initialValue: TEXT_FORMAT_NONE,
  options: {
    [TEXT_FORMAT_NONE]: 'Any text',
    [TEXT_FORMAT_EMAIL]: 'Email address',
    [TEXT_FORMAT_PHONE]: 'Phone number',
    [TEXT_FORMAT_URL]: 'Web address (URL)',
    [TEXT_FORMAT_CUSTOM]: 'Custom pattern',
  },
  schemaSpec: {
    $type: String,
    $name: 'Text Format',
    $validate: {
      required: true,
      notEmpty: true,
      inArray: { values: [...TEXT_FORMATS] },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(entity, `attributes.${ATTRIBUTE_QUESTION_TEXT_FORMAT}`) ||
      TEXT_FORMAT_NONE
    )
  },
}
