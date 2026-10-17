/**
 * Question shape read from a merged snapshot survey. `mergeSurveyLanguageSnapshots`
 * returns a constructed `Survey`, so these are `SurveyQuestion` instances iterated
 * via the `survey.elements.questions()` filtered collection; only the fields below are used.
 */
export interface StatsQuestion {
  _id: string
  code: string
  type: string
  text: object
  answerOptions?: { _id: string; code: string; label: object }[]
  subquestions?: { _id: string; code: string; text: object }[]
}

/**
 * Response shape read via a `select: { answers: 1 }` projection — only the
 * `answers` field is populated on these documents.
 */
export interface StatsResponse {
  answers: Record<string, unknown>
}

export interface OptionStat {
  optionId: string
  optionCode: string
  optionLabel: object
  count: number
  percentage: number
}

/**
 * Aggregated stats for one answer-option cell of a matrix subquestion column.
 * `count`/`percentage` apply to boolean-cell matrix types (matrixCheckbox,
 * matrixYesNo); `average` applies to matrixNumber. For matrixYesNo, `count` is
 * the explicit "Yes" count and `falseCount` the explicit "No" count; the "blank"
 * count is left implicit (`totalResponses - count - falseCount`).
 */
export interface MatrixCellStat {
  optionId: string
  optionCode: string
  optionLabel: object
  count: number
  percentage: number
  average?: number
  falseCount?: number
}

export interface MatrixSubquestionStats {
  subquestionId: string
  subquestionCode: string
  subquestionText: object
  cellStats: MatrixCellStat[]
}

/**
 * Aggregated stats for one part of a Multi-Part question, treated as a
 * standalone question of its enforced type. `optionStats` applies to
 * choice-shaped part types (yesNo, starRating, point5, point10);
 * `average` applies to Multi-Part Number.
 */
export interface MultiPartStat {
  partId: string
  partCode: string
  partText: object
  partType: string
  optionStats: OptionStat[]
  average?: number
}

/**
 * Aggregated stats for one answer option of a Ranking question. `rankCounts[i]`
 * is how many responses placed this option at rank `i + 1`; `averageRank` is the
 * mean 1-based position among the responses that ranked it (unranked responses
 * are excluded, so `rankedPercentage` conveys how representative it is).
 */
export interface RankingOptionStat {
  optionId: string
  optionCode: string
  optionLabel: object
  rankedCount: number
  rankedPercentage: number
  averageRank: number | null
  rankCounts: number[]
}

/**
 * One grouped location on the results map: every pin that rounds to the same
 * grid cell, so exact coordinates beyond the grid never leave the server.
 */
export interface MapStatPoint {
  lat: number
  lng: number
  count: number
}

/**
 * Aggregated stats for a Map question. `points` holds up to
 * `MAP_STATS_MAX_POINTS` grid cells, busiest first; `truncated` is set when
 * quieter cells were left out. `pinCount` counts every pin, including those
 * in left-out cells. `bounds` is `[south, west, north, east]` over all pins.
 */
export interface MapStats {
  points: MapStatPoint[]
  pinCount: number
  distinctPoints: number
  truncated: boolean
  bounds: [number, number, number, number] | null
}

export interface QuestionStats {
  questionId: string
  questionCode: string
  questionType: string
  questionText: object
  totalResponses: number
  optionStats: OptionStat[]
  matrixSubquestionStats?: MatrixSubquestionStats[]
  multiPartStats?: MultiPartStat[]
  rankingStats?: RankingOptionStat[]
  mapStats?: MapStats
}

export interface SurveyStatsResult {
  surveyId: string
  snapshotId: string
  totalResponses: number
  filter: {
    publicationId?: string
    completed: string
    startDate?: string
    endDate?: string
    dateField?: string
  }
  questionStats: QuestionStats[]
}
