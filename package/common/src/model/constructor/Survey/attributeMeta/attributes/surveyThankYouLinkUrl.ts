import { AttributeMeta, SURVEY_ENTITY_TYPE_THANK_YOU } from '../types'
import { ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL } from '../constants'

export const surveyThankYouLinkUrlMeta: AttributeMeta = {
  id: ATTRIBUTE_SURVEY_THANK_YOU_LINK_URL,
  entityTypes: [SURVEY_ENTITY_TYPE_THANK_YOU],
  name: 'End URL',
  description:
    'The URL to link to (or redirect to, if Redirect End is enabled) after survey completion',
  typesLimit: [],
  initialValue: '',
  schemaSpec: {
    $type: String,
    $name: 'End URL',
    $validate: {
      required: false,
    },
  },
  getValue: (entity, langEditing = 'en') => {
    // Read the raw per-language value only — no cross-language fallback.
    // Falling back to another language's URL here would make the field
    // appear un-clearable: an empty value for langEditing would keep
    // displaying another language's text after every save.
    if (
      entity &&
      'thankYouSection' in entity &&
      entity.thankYouSection?.config?.link?.url
    ) {
      return entity.thankYouSection.config.link.url[langEditing] || ''
    }
    return ''
  },
}
