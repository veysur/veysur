import { QUESTION_TYPE_STAR_RATING } from '../attributeMeta/types'
import { QuestionTypeDefinition } from './types'
import { buildPointScaleOptions } from './pointScale'

export const starRatingDefinition: QuestionTypeDefinition = {
  type: QUESTION_TYPE_STAR_RATING,
  predefinedAnswerOptions: buildPointScaleOptions(5),
}
