import { AttributeMeta, SURVEY_ENTITY_TYPE_TITLE } from '../types'
import { ATTRIBUTE_SURVEY_TITLE } from '../constants'

export const surveyTitleMeta: AttributeMeta = {
  id: ATTRIBUTE_SURVEY_TITLE,
  entityTypes: [SURVEY_ENTITY_TYPE_TITLE],
  name: 'Title Text',
  description: 'Edit the survey title text',
  typesLimit: [],
  initialValue: '',
  schemaSpec: {
    $type: String,
    $name: 'Title Text',
    $validate: {
      required: false,
    },
  },
  getValue: (entity, langEditing = 'en') => {
    if (
      entity &&
      'title' in entity &&
      entity.title &&
      typeof entity.title.getLang === 'function'
    ) {
      return entity.title.getLang(langEditing)
    }
    return ''
  },
}
