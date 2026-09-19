import { StatsAggregatorMatrixNumber } from './StatsAggregatorMatrixNumber'
import type { StatsQuestion, StatsResponse } from './types'

describe('StatsAggregatorMatrixNumber', () => {
  const question: StatsQuestion = {
    _id: 'q1',
    code: 'q1',
    type: 'matrixNumber',
    text: { en: 'Matrix number question' },
    answerOptions: [{ _id: 'ao1', code: 'ao1', label: { en: 'Row 1' } }],
    subquestions: [{ _id: 'sq1', code: 'sq1', text: { en: 'Column 1' } }],
  }

  const responses: StatsResponse[] = [
    { answers: { q1: { sq1: { ao1: 4 } } } },
    { answers: { q1: { sq1: { ao1: 6 } } } },
    { answers: { q1: { sq1: { ao1: '' } } } }, // unfilled cell, ignored
    { answers: { q1: {} } }, // no answer at all for this question
  ]

  test('averages only the filled numeric cells for each subquestion x answer option', () => {
    const result = StatsAggregatorMatrixNumber.aggregate(question, responses, 4)

    expect(result.optionStats).toEqual([])
    expect(result.matrixSubquestionStats![0].cellStats).toEqual([
      {
        optionId: 'ao1',
        optionCode: 'ao1',
        optionLabel: { en: 'Row 1' },
        count: 2,
        percentage: 0,
        average: 5,
      },
    ])
  })

  test('reports zero average when no cell has a numeric value', () => {
    const result = StatsAggregatorMatrixNumber.aggregate(question, [], 0)
    expect(result.matrixSubquestionStats![0].cellStats[0]).toMatchObject({
      count: 0,
      average: 0,
    })
  })
})
