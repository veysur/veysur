import { RANKING_ORDER_KEY } from 'veysur-common'

import type { RankingOptionStat, StatsQuestion, StatsResponse } from './types'
import { percentOf } from './statsPercent'

/**
 * Reads a ranking question's ordered answer-option codes out of a response.
 * The stored shape is `{ [optionCode]: true, ..., ORDER: ['AO3', 'AO1'] }`;
 * `ORDER` position is the rank (index 0 = rank 1). Returns `[]` when the answer
 * is missing or malformed.
 */
export function getRankingOrder(
  response: StatsResponse,
  questionCode: string,
): string[] {
  const answer = response.answers[questionCode]
  if (typeof answer !== 'object' || answer === null) return []
  const order = (answer as Record<string, unknown>)[RANKING_ORDER_KEY]
  return Array.isArray(order)
    ? order.filter((code): code is string => typeof code === 'string')
    : []
}

/**
 * Walks every response's ORDER array, accumulating per-answer-option rank
 * counts and the mean rank among responses that ranked each option. Codes in
 * ORDER that are not on the current snapshot's option list (stale after an
 * edit) are ignored. Trailing rank slots that no response reached are trimmed.
 */
export function buildRankingStats(
  question: StatsQuestion,
  responses: StatsResponse[],
  totalResponses: number,
): RankingOptionStat[] {
  const answerOptions = Array.isArray(question.answerOptions)
    ? question.answerOptions
    : []
  const maxSlots = Math.max(answerOptions.length, 1)

  type Acc = { rankedCount: number; rankSum: number; rankCounts: number[] }
  const accByCode = new Map<string, Acc>()
  answerOptions.forEach((option) => {
    accByCode.set(option.code, {
      rankedCount: 0,
      rankSum: 0,
      rankCounts: new Array(maxSlots).fill(0),
    })
  })

  let usedSlots = 0

  responses.forEach((response) => {
    const order = getRankingOrder(response, question.code)
    order.forEach((code, index) => {
      const acc = accByCode.get(code)
      if (!acc || index >= maxSlots) return
      acc.rankedCount += 1
      acc.rankSum += index + 1
      acc.rankCounts[index] += 1
      if (index + 1 > usedSlots) usedSlots = index + 1
    })
  })

  const slots = Math.max(usedSlots, 1)

  return answerOptions.map((option) => {
    const acc = accByCode.get(option.code)!
    const averageRank =
      acc.rankedCount > 0
        ? Math.round((acc.rankSum / acc.rankedCount) * 100) / 100
        : null
    const rankedPercentage = percentOf(acc.rankedCount, totalResponses)

    return {
      optionId: option._id,
      optionCode: option.code,
      optionLabel: option.label,
      rankedCount: acc.rankedCount,
      rankedPercentage,
      averageRank,
      rankCounts: acc.rankCounts.slice(0, slots),
    }
  })
}
