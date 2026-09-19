import { QUESTION_TYPE_POINT_5 } from '../attributeMeta/types'
import { QuestionTypeDefinition } from './types'
import { buildPointScaleOptions } from './pointScale'

export const point5Definition: QuestionTypeDefinition = {
  type: QUESTION_TYPE_POINT_5,
  predefinedAnswerOptions: buildPointScaleOptions(5),
}
