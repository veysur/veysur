import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  QUESTION_TYPE_TEXT,
} from '../types'
import { ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES } from '../constants'
import { getNestedValue } from '../helpers'

export const questionTextFormatCountriesMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT, SURVEY_ENTITY_TYPE_SUBQUESTION],
  name: 'Countries',
  description:
    'Countries whose phone numbers are accepted. Leave empty to accept any country, with the number starting with +',
  typesLimit: [QUESTION_TYPE_TEXT],
  initialValue: '',
  schemaSpec: {
    $type: String,
    $name: 'Countries',
    $validate: {
      regex: [
        {
          pattern: /^\s*([A-Za-z]{2}\s*(,\s*[A-Za-z]{2}\s*)*)?$/,
          message: 'Use two-letter country codes separated by commas',
        },
      ],
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(
        entity,
        `attributes.${ATTRIBUTE_QUESTION_TEXT_FORMAT_COUNTRIES}`,
      ) || ''
    )
  },
}
