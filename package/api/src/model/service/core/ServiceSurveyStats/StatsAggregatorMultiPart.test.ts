import { StatsAggregatorMultiPart } from './StatsAggregatorMultiPart'
import type { StatsQuestion, StatsResponse } from './types'

describe('StatsAggregatorMultiPart', () => {
  test('aggregates yesNo parts using the same optionStats shape as standalone Yes/No', () => {
    const question: StatsQuestion = {
      _id: 'q1',
      code: 'q1',
      type: 'multiPartYesNo',
      text: { en: 'Multi-Part question' },
      subquestions: [
        { _id: 'p1', code: 'p1', text: { en: 'Part 1' } },
        { _id: 'p2', code: 'p2', text: { en: 'Part 2' } },
      ],
    }

    const responses: StatsResponse[] = [
      { answers: { q1: { p1: true, p2: false } } },
      { answers: { q1: { p1: true, p2: true } } },
      { answers: { q1: { p1: false } } },
    ]

    const result = StatsAggregatorMultiPart.aggregate(question, responses, 3)

    expect(result.optionStats).toEqual([])
    expect(result.multiPartStats).toHaveLength(2)

    const part1 = result.multiPartStats!.find((p) => p.partCode === 'p1')!
    expect(part1.partType).toBe('yesNo')
    const yesCount = part1.optionStats.find((o) => o.optionCode === 'yes')!
    expect(yesCount.count).toBe(2)
    const noCount = part1.optionStats.find((o) => o.optionCode === 'no')!
    expect(noCount.count).toBe(1)
  })

  test('averages Multi-Part Number parts, ignoring unanswered parts', () => {
    const question: StatsQuestion = {
      _id: 'q1',
      code: 'q1',
      type: 'multiPartNumber',
      text: { en: 'Multi-Part number question' },
      subquestions: [{ _id: 'p1', code: 'p1', text: { en: 'Part 1' } }],
    }

    const responses: StatsResponse[] = [
      { answers: { q1: { p1: 10 } } },
      { answers: { q1: { p1: 20 } } },
      { answers: { q1: {} } },
    ]

    const result = StatsAggregatorMultiPart.aggregate(question, responses, 3)
    const part1 = result.multiPartStats![0]
    expect(part1.average).toBe(15)
    expect(part1.optionStats).toEqual([])
  })

  test('handles no responses without dividing by zero', () => {
    const question: StatsQuestion = {
      _id: 'q1',
      code: 'q1',
      type: 'multiPartStarRating',
      text: { en: 'Multi-Part star question' },
      subquestions: [{ _id: 'p1', code: 'p1', text: { en: 'Part 1' } }],
    }

    const result = StatsAggregatorMultiPart.aggregate(question, [], 0)
    expect(
      result.multiPartStats![0].optionStats.every(
        (option) => option.percentage === 0,
      ),
    ).toBe(true)
  })
})
