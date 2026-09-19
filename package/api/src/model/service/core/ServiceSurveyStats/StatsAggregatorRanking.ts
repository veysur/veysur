import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import { buildRankingStats } from './rankingStatsUtils'

/**
 * Aggregates ranking questions: each response contributes an ordered list of
 * answer-option codes, which we turn into a per-option rank-position matrix
 * (`rankingStats`). `optionStats` stays empty, matching the matrix/multi-part
 * convention.
 */
export class StatsAggregatorRanking {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ): QuestionStats {
    return {
      questionId: question._id,
      questionCode: question.code,
      questionType: question.type,
      questionText: question.text,
      totalResponses: responses.length,
      optionStats: [],
      rankingStats: buildRankingStats(question, responses, totalResponses),
    }
  }
}
