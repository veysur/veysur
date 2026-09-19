import { AttributeMeta, SURVEY_ENTITY_TYPE_WELCOME } from '../types'
import { ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE } from '../constants'
import { getNestedValue } from '../helpers'

export const surveyPresentationWelcomeMessageMeta: AttributeMeta = {
  id: ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE,
  entityTypes: [SURVEY_ENTITY_TYPE_WELCOME],
  name: 'Show welcome message',
  description: 'Show welcome message',
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
    return getNestedValue(entity, ATTRIBUTE_SURVEY_PRESENTATION_WELCOME_MESSAGE)
  },
}
