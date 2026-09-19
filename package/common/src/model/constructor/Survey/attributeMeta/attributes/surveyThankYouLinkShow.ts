import { AttributeMeta, SURVEY_ENTITY_TYPE_THANK_YOU } from '../types'
import { ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW } from '../constants'
import { getNestedValue } from '../helpers'

export const surveyThankYouLinkShowMeta: AttributeMeta = {
  id: ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW,
  entityTypes: [SURVEY_ENTITY_TYPE_THANK_YOU],
  name: 'Show End URL link',
  description: 'Show End URL link',
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
    return getNestedValue(entity, ATTRIBUTE_SURVEY_THANK_YOU_LINK_SHOW)
  },
}
