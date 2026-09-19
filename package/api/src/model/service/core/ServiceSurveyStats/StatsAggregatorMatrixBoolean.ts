import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import {
  getMatrixCellValue,
  buildMatrixSubquestionStats,
} from './matrixStatsUtils'
import { percentOf } from './statsPercent'

/**
 * Aggregates matrixCheckbox / matrixYesNo questions: each cell is a boolean,
 * so per (subquestion, answer option) we count how many responses have that
 * cell set to true.
 *
 * For matrixYesNo each cell is an independent Yes/No toggle with a real third
 * "blank" state, so an explicit "No" (`false`) is counted separately in
 * `falseCount`. For matrixCheckbox `false` and absent both mean "unticked", so
 * only the true `count` is reported.
 */
export class StatsAggregatorMatrixBoolean {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ): QuestionStats {
    const isYesNo = question.type === 'matrixYesNo'

    const matrixSubquestionStats = buildMatrixSubquestionStats(
      question,
      (option, subquestion) => {
        let count = 0
        let falseCount = 0
        for (const response of responses) {
          const cellValue = getMatrixCellValue(
            response,
            question.code,
            option.code,
            subquestion.code,
          )
          if (cellValue === true) count += 1
          else if (cellValue === false) falseCount += 1
        }
        return {
          optionId: option._id,
          optionCode: option.code,
          optionLabel: option.label,
          count,
          percentage: percentOf(count, totalResponses),
          ...(isYesNo ? { falseCount } : {}),
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
