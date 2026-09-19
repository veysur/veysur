import { AttributeMeta, SURVEY_ENTITY_TYPE_THANK_YOU } from '../types'
import { ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT } from '../constants'

export const surveyThankYouLinkTextMeta: AttributeMeta = {
  id: ATTRIBUTE_SURVEY_THANK_YOU_LINK_TEXT,
  entityTypes: [SURVEY_ENTITY_TYPE_THANK_YOU],
  name: 'Link text',
  description: 'The label for the End URL link',
  typesLimit: [],
  initialValue: '',
  schemaSpec: {
    $type: String,
    $name: 'Link text',
    $validate: {
      required: false,
    },
  },
  getValue: (entity, langEditing = 'en') => {
    // Read the raw per-language value only — no cross-language fallback.
    // Falling back to another language's text here would make the field
    // appear un-clearable: an empty value for langEditing would keep
    // displaying another language's text after every save.
    if (
      entity &&
      'thankYouSection' in entity &&
      entity.thankYouSection?.config?.link?.text
    ) {
      return entity.thankYouSection.config.link.text[langEditing] || ''
    }
    return ''
  },
}
