import { QuestionType, QUESTION_TYPE_RANKING } from './attributeMeta/types'

/**
 * Ranking question types whose ORDER response data aggregates into the stats
 * page's per-rank-position model. Mirrors `MATRIX_STATS_COMPATIBLE_TYPES` /
 * `MULTI_PART_STATS_COMPATIBLE_TYPES` - a dedicated predicate so the stats
 * pipeline can opt ranking in without widening `isChoiceQuestionType`, which is
 * consumed far more broadly (validation, conditions, editor UI).
 */
export const RANKING_STATS_COMPATIBLE_TYPES: QuestionType[] = [
  QUESTION_TYPE_RANKING,
]

export function isRankingStatsCompatibleType(type: string): boolean {
  return RANKING_STATS_COMPATIBLE_TYPES.includes(type as QuestionType)
}
