import { QUESTION_TYPE_POINT_10 } from '../attributeMeta/types'
import { QuestionTypeDefinition } from './types'
import { buildPointScaleOptions } from './pointScale'

export const point10Definition: QuestionTypeDefinition = {
  type: QUESTION_TYPE_POINT_10,
  predefinedAnswerOptions: buildPointScaleOptions(10),
}
