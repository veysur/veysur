import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import {
  getMatrixCellValue,
  buildMatrixSubquestionStats,
} from './matrixStatsUtils'

/**
 * Aggregates matrixNumber questions: each cell is a number, so per
 * (subquestion, answer option) we compute the mean of all filled-in values.
 */
export class StatsAggregatorMatrixNumber {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    _totalResponses: number,
  ): QuestionStats {
    const matrixSubquestionStats = buildMatrixSubquestionStats(
      question,
      (option, subquestion) => {
        const values: number[] = []
        responses.forEach((response) => {
          const cellValue = getMatrixCellValue(
            response,
            question.code,
            option.code,
            subquestion.code,
          )
          if (typeof cellValue === 'number' && !Number.isNaN(cellValue)) {
            values.push(cellValue)
          }
        })

        const count = values.length
        const average =
          count > 0
            ? Math.round(
                (values.reduce((sum, value) => sum + value, 0) / count) * 10,
              ) / 10
            : 0

        return {
          optionId: option._id,
          optionCode: option.code,
          optionLabel: option.label,
          count,
          percentage: 0,
          average,
        }
      },
    )

    return {
      questionId: question._id,
      questionCode: question.code,
      questionType: question.type,
      questionText: question.text,
      totalResponses: responses.length,
      optionStats: [],
      matrixSubquestionStats,
    }
  }
}
