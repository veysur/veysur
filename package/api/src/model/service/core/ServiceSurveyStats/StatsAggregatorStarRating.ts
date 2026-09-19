import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import { percentOf } from './statsPercent'

export class StatsAggregatorStarRating {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
  ): QuestionStats {
    const starOptions = [
      { code: '1', label: { en: '1 Star' } },
      { code: '2', label: { en: '2 Stars' } },
      { code: '3', label: { en: '3 Stars' } },
      { code: '4', label: { en: '4 Stars' } },
      { code: '5', label: { en: '5 Stars' } },
    ]
    const optionCounts = new Map<string, number>([
      ['1', 0],
      ['2', 0],
      ['3', 0],
      ['4', 0],
      ['5', 0],
    ])

    responses.forEach((response) => {
      const answer = response.answers[question.code]
      if (typeof answer === 'number' && answer >= 1 && answer <= 5) {
        const key = String(answer)
        optionCounts.set(key, optionCounts.get(key)! + 1)
      }
    })

    const optionStats = starOptions.map((option) => {
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
