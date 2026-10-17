import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import { buildMapStats } from './mapStatsUtils'

/**
 * Aggregates map questions: each response contributes one pin, grouped into
 * grid cells (`mapStats`). `optionStats` stays empty, matching the
 * matrix/multi-part/ranking convention.
 */
export class StatsAggregatorMap {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
  ): QuestionStats {
    return {
      questionId: question._id,
      questionCode: question.code,
      questionType: question.type,
      questionText: question.text,
      totalResponses: responses.length,
      optionStats: [],
      mapStats: buildMapStats(question.code, responses),
    }
  }
}
