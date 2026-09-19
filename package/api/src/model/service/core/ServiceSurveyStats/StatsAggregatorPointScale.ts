import type { QuestionStats, StatsQuestion, StatsResponse } from './types'
import { percentOf } from './statsPercent'

export class StatsAggregatorPointScale {
  static aggregate(
    question: StatsQuestion,
    responses: StatsResponse[],
    totalResponses: number,
    pointCount: number,
    labelSuffix: string = 'Point',
  ): QuestionStats {
    // Dynamically generate options based on pointCount
    const pointOptions = Array.from({ length: pointCount }, (_, i) => {
      const num = i + 1
      return {
        code: String(num),
        label: { en: `${num} ${labelSuffix}${num === 1 ? '' : 's'}` },
      }
    })

    // Initialize counts map
    const optionCounts = new Map<string, number>(
      pointOptions.map((opt) => [opt.code, 0]),
    )

    responses.forEach((response) => {
      const answer = response.answers[question.code]
      if (typeof answer === 'number' && answer >= 1 && answer <= pointCount) {
        const key = String(answer)
        optionCounts.set(key, optionCounts.get(key)! + 1)
      }
    })

    const optionStats = pointOptions.map((option) => {
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
