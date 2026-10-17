import { StatsAggregatorMap } from './StatsAggregatorMap'
import type { StatsQuestion } from './types'

describe('StatsAggregatorMap', () => {
  const question: StatsQuestion = {
    _id: 'q1',
    code: 'Q1',
    type: 'map',
    text: { en: 'Where do you live?' },
  }

  it('returns the question identity with map stats and no option stats', () => {
    const result = StatsAggregatorMap.aggregate(question, [
      { answers: { Q1: { lat: 51.5, lng: -0.1, precision: 'coarse' } } },
      { answers: {} },
    ])

    expect(result).toMatchObject({
      questionId: 'q1',
      questionCode: 'Q1',
      questionType: 'map',
      totalResponses: 2,
      optionStats: [],
    })
    expect(result.mapStats).toMatchObject({
      pinCount: 1,
      points: [{ lat: 51.5, lng: -0.1, count: 1 }],
    })
  })
})
