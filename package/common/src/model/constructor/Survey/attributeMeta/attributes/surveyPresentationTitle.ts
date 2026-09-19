import { AttributeMeta, SURVEY_ENTITY_TYPE_TITLE } from '../types'
import { ATTRIBUTE_SURVEY_PRESENTATION_TITLE } from '../constants'
import { getNestedValue } from '../helpers'

export const surveyPresentationTitleMeta: AttributeMeta = {
  id: ATTRIBUTE_SURVEY_PRESENTATION_TITLE,
  entityTypes: [SURVEY_ENTITY_TYPE_TITLE],
  name: 'Show title',
  description: 'Show title',
  typesLimit: [],
  initialValue: true,
  schemaSpec: {
    $type: Boolean,
    $name: 'Required',
    $validate: {
      required: true,
    },
  },
  getValue: (entity) => {
    return getNestedValue(entity, ATTRIBUTE_SURVEY_PRESENTATION_TITLE)
  },
}
