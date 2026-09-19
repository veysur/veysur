import { AttributeMeta, SURVEY_ENTITY_TYPE_ELEMENT } from '../types'
import {
  ATTRIBUTE_MATRIX_ORIENTATION,
  MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS,
  MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
} from '../constants'
import { getNestedValue } from '../helpers'
import { MATRIX_QUESTION_TYPES } from '../../Matrix'

export const matrixOrientationMeta: AttributeMeta = {
  id: ATTRIBUTE_MATRIX_ORIENTATION,
  entityTypes: [SURVEY_ENTITY_TYPE_ELEMENT],
  name: 'Matrix Orientation',
  description:
    'Which item type is displayed as rows (the other becomes columns)',
  typesLimit: MATRIX_QUESTION_TYPES,
  initialValue: MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
  options: {
    [MATRIX_ORIENTATION_ANSWER_OPTIONS_ROWS]: 'Answer options as rows',
    [MATRIX_ORIENTATION_SUBQUESTIONS_ROWS]: 'Subquestions as rows',
  },
  schemaSpec: {
    $type: String,
    $name: 'Matrix Orientation',
    $validate: { required: true, notEmpty: true },
  },
  getValue: (entity) =>
    getNestedValue(entity, `attributes.${ATTRIBUTE_MATRIX_ORIENTATION}`) ||
    MATRIX_ORIENTATION_SUBQUESTIONS_ROWS,
}
