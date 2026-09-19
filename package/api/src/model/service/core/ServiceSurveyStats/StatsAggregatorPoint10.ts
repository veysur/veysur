import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import { StatsAggregatorPointScale } from './StatsAggregatorPointScale'

export class StatsAggregatorPoint10 {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ): QuestionStats {
    return StatsAggregatorPointScale.aggregate(
      question,
      responses,
      totalResponses,
      10,
      'Point',
    )
  }
}
