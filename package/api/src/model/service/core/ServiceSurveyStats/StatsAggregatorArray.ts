import type {
  QuestionStats,
  OptionStat,
  StatsQuestion,
  StatsResponse,
} from './types'
import { percentOf } from './statsPercent'

export class StatsAggregatorArray {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ): QuestionStats {
    // Initialize option counters using option CODES (not IDs)
    const optionCounts = new Map<string, number>()
    const answerOptions = Array.isArray(question.answerOptions)
      ? question.answerOptions
      : []

    // Map by option code since responses store codes, not IDs
    answerOptions.forEach((option) => {
      optionCounts.set(option.code, 0)
    })

    // Aggregate answer counts
    responses.forEach((response) => {
      const answer = response.answers[question.code]

      // Multiple choice answers are now objects: { [optionCode]: true }
      if (
        typeof answer === 'object' &&
        answer !== null &&
        !Array.isArray(answer)
      ) {
        // Count each selected option (keys with truthy values)
        Object.entries(answer).forEach(([optionCode, selected]) => {
          if (selected && optionCounts.has(optionCode)) {
            optionCounts.set(optionCode, optionCounts.get(optionCode)! + 1)
          }
        })
      }
    })

    // Build option stats
    const optionStats: OptionStat[] = answerOptions.map((option) => {
      const count = optionCounts.get(option.code) || 0

      return {
        optionId: option._id,
        optionCode: option.code,
        optionLabel: option.label,
        count,
        percentage: percentOf(count, totalResponses),
      }
    })

    return {
      questionId: question._id,
      questionCode: question.code,
      questionType: question.type,
      questionText: question.text,
      totalResponses: responses.length,
      optionStats,
    }
  }
}
