import { StatsAggregatorRanking } from './StatsAggregatorRanking'
import type { StatsQuestion, StatsResponse } from './types'

describe('StatsAggregatorRanking', () => {
  const question: StatsQuestion = {
    _id: 'q1',
    code: 'q1',
    type: 'ranking',
    text: { en: 'Rank these' },
    answerOptions: [
      { _id: 'ao1', code: 'ao1', label: { en: 'Apple' } },
      { _id: 'ao2', code: 'ao2', label: { en: 'Banana' } },
      { _id: 'ao3', code: 'ao3', label: { en: 'Cherry' } },
    ],
  }

  const responses: StatsResponse[] = [
    // full ranking
    {
      answers: {
        q1: { ao1: true, ao2: true, ao3: true, ORDER: ['ao1', 'ao2', 'ao3'] },
      },
    },
    // full ranking, different order
    {
      answers: {
        q1: { ao3: true, ao1: true, ao2: true, ORDER: ['ao3', 'ao1', 'ao2'] },
      },
    },
    // partial ranking — ao3 unranked
    { answers: { q1: { ao2: true, ao1: true, ORDER: ['ao2', 'ao1'] } } },
    // stale code in ORDER plus a missing option
    { answers: { q1: { ORDER: ['ao1', 'gone'] } } },
    // no answer for this question
    { answers: {} },
  ]

  test('builds per-option rank counts and average rank excluding unranked', () => {
    const result = StatsAggregatorRanking.aggregate(question, responses, 5)

    expect(result.optionStats).toEqual([])
    expect(result.questionType).toBe('ranking')
    expect(result.rankingStats).toHaveLength(3)

    const byCode = Object.fromEntries(
      result.rankingStats!.map((s) => [s.optionCode, s]),
    )

    // ao1 ranked at positions 1, 2, 2, 1 -> avg 1.5 over 4 rankers of 5 responses
    expect(byCode.ao1).toEqual({
      optionId: 'ao1',
      optionCode: 'ao1',
      optionLabel: { en: 'Apple' },
      rankedCount: 4,
      rankedPercentage: 80,
      averageRank: 1.5,
      rankCounts: [2, 2, 0],
    })

    // ao2 ranked at positions 2, 3, 1 -> avg 2
    expect(byCode.ao2).toMatchObject({
      rankedCount: 3,
      averageRank: 2,
      rankCounts: [1, 1, 1],
    })

    // ao3 ranked at positions 3, 1 -> avg 2, only 2 of 5 ranked it
    expect(byCode.ao3).toMatchObject({
      rankedCount: 2,
      rankedPercentage: 40,
      averageRank: 2,
      rankCounts: [1, 0, 1],
    })
  })

  test('handles zero responses without dividing by zero', () => {
    const result = StatsAggregatorRanking.aggregate(question, [], 0)
    expect(result.rankingStats).toHaveLength(3)
    expect(
      result.rankingStats!.every(
        (s) =>
          s.averageRank === null &&
          s.rankedPercentage === 0 &&
          s.rankedCount === 0,
      ),
    ).toBe(true)
  })
})
