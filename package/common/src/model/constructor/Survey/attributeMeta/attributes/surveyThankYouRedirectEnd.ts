import { AttributeMeta, SURVEY_ENTITY_TYPE_THANK_YOU } from '../types'
import { ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END } from '../constants'
import { getNestedValue } from '../helpers'

export const surveyThankYouRedirectEndMeta: AttributeMeta = {
  id: ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END,
  entityTypes: [SURVEY_ENTITY_TYPE_THANK_YOU],
  name: 'Redirect end',
  description:
    'Redirect to the End URL automatically instead of showing a button',
  typesLimit: [],
  initialValue: false,
  schemaSpec: {
    $type: Boolean,
    $name: 'Required',
    $validate: {
      required: true,
    },
  },
  getValue: (entity) => {
    return getNestedValue(entity, ATTRIBUTE_SURVEY_THANK_YOU_REDIRECT_END)
  },
}
