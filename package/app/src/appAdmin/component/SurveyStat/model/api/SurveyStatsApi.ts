import { CompletionStatusFilter } from 'veysur-common'

import { Api, ErrorRest } from 'model'

export interface OptionStat {
  optionId: string
  optionCode: string
  optionLabel: { [lang: string]: string }
  count: number
  percentage: number
}

/**
 * Aggregated stats for one answer-option cell of a matrix subquestion column.
 * `count`/`percentage` apply to boolean-cell matrix types (matrixCheckbox,
 * matrixYesNo); `average` applies to matrixNumber. For matrixYesNo, `count` is
 * the explicit "Yes" count and `falseCount` the explicit "No" count; "blank" is
 * left implicit (`totalResponses - count - falseCount`).
 */
export interface MatrixCellStat {
  optionId: string
  optionCode: string
  optionLabel: { [lang: string]: string }
  count: number
  percentage: number
  average?: number
  falseCount?: number
}

export interface MatrixSubquestionStats {
  subquestionId: string
  subquestionCode: string
  subquestionText: { [lang: string]: string }
  cellStats: MatrixCellStat[]
}

/**
 * Aggregated stats for one part of a Multi-Part question, treated as a
 * standalone question of its enforced type. `optionStats` applies to
 * choice-shaped part types (yesNo, starRating, point5, point10); `average`
 * applies to Multi-Part Number.
 */
export interface MultiPartStat {
  partId: string
  partCode: string
  partText: { [lang: string]: string }
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
  optionLabel: { [lang: string]: string }
  rankedCount: number
  rankedPercentage: number
  averageRank: number | null
  rankCounts: number[]
}

export interface QuestionStats {
  questionId: string
  questionCode: string
  questionType: string
  questionText: { [lang: string]: string }
  totalResponses: number
  optionStats: OptionStat[]
  multiPartStats?: MultiPartStat[]
  matrixSubquestionStats?: MatrixSubquestionStats[]
  rankingStats?: RankingOptionStat[]
}

export interface SurveyStatsResponse {
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

export class SurveyStatsApi extends Api {
  async getStats(
    surveyId: string,
    snapshotId: string,
    publicationId?: string,
    completed: CompletionStatusFilter = 'all',
    startDate?: string | null,
    endDate?: string | null,
    dateField: 'createdAt' | 'completed' | 'updatedAt' = 'createdAt',
    search?: string,
  ): Promise<SurveyStatsResponse> {
    try {
      const params: {
        completed: CompletionStatusFilter
        publicationId?: string
        startDate?: string
        endDate?: string
        dateField?: 'createdAt' | 'completed' | 'updatedAt'
        search?: string
      } = { completed }

      if (publicationId && publicationId.trim()) {
        params.publicationId = publicationId
      }

      if (startDate) {
        params.startDate = startDate
      }

      if (endDate) {
        params.endDate = endDate
      }

      if (dateField) {
        params.dateField = dateField
      }

      if (search && search.trim()) {
        params.search = search.trim()
      }

      return await this.getClient().get<SurveyStatsResponse>(
        `/survey-stats/${surveyId}/${snapshotId}`,
        { params },
      )
    } catch (error) {
      throw ErrorRest.fromRequestError(error as Error)
    }
  }
}
