import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import { percentOf } from './statsPercent'

export class StatsAggregatorYesNo {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ): QuestionStats {
    const yesNoOptions = [
      { code: 'yes', label: { en: 'Yes' } },
      { code: 'no', label: { en: 'No' } },
    ]
    const optionCounts = new Map<string, number>([
      ['yes', 0],
      ['no', 0],
    ])

    responses.forEach((response) => {
      const answer = response.answers[question.code]
      if (answer === true) {
        optionCounts.set('yes', optionCounts.get('yes')! + 1)
      } else if (answer === false) {
        optionCounts.set('no', optionCounts.get('no')! + 1)
      }
    })

    const optionStats = yesNoOptions.map((option) => {
      const count = optionCounts.get(option.code) || 0
      return {
        optionId: option.code,
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
