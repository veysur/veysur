import {
  AttributeMeta,
  SURVEY_ENTITY_TYPE_ELEMENT,
  QUESTION_TYPE_IMAGE_SELECT,
} from '../types'
import {
  ATTRIBUTE_QUESTION_COLUMNS,
  ATTRIBUTE_COLUMNS_COUNT_1,
  ATTRIBUTE_COLUMNS_COUNT_2,
  ATTRIBUTE_COLUMNS_COUNT_3,
} from '../constants'
import { getNestedValue } from '../helpers'

export const columnsMeta: AttributeMeta = {
  id: ATTRIBUTE_QUESTION_COLUMNS,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT],
  name: 'Columns',
  description: 'Number of columns used to display images',
  typesLimit: [QUESTION_TYPE_IMAGE_SELECT],
  initialValue: ATTRIBUTE_COLUMNS_COUNT_2,
  options: {
    [ATTRIBUTE_COLUMNS_COUNT_1]: '1 Column',
    [ATTRIBUTE_COLUMNS_COUNT_2]: '2 Columns',
    [ATTRIBUTE_COLUMNS_COUNT_3]: '3 Columns',
  },
  schemaSpec: {
    $type: Number,
    $name: 'Columns',
    $validate: {
      required: true,
      inArray: {
        values: [
          ATTRIBUTE_COLUMNS_COUNT_1,
          ATTRIBUTE_COLUMNS_COUNT_2,
          ATTRIBUTE_COLUMNS_COUNT_3,
        ],
      },
    },
  },
  getValue: (entity) => {
    return (
      getNestedValue(entity, `attributes.${ATTRIBUTE_QUESTION_COLUMNS}`) ??
      ATTRIBUTE_COLUMNS_COUNT_2
    )
  },
}
