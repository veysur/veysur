import { StatsAggregatorMatrixBoolean } from './StatsAggregatorMatrixBoolean'
import type { StatsQuestion, StatsResponse } from './types'

describe('StatsAggregatorMatrixBoolean', () => {
  const question: StatsQuestion = {
    _id: 'q1',
    code: 'q1',
    type: 'matrixCheckbox',
    text: { en: 'Matrix question' },
    answerOptions: [
      { _id: 'ao1', code: 'ao1', label: { en: 'Row 1' } },
      { _id: 'ao2', code: 'ao2', label: { en: 'Row 2' } },
    ],
    subquestions: [
      { _id: 'sq1', code: 'sq1', text: { en: 'Column 1' } },
      { _id: 'sq2', code: 'sq2', text: { en: 'Column 2' } },
    ],
  }

  const responses: StatsResponse[] = [
    {
      answers: {
        q1: { sq1: { ao1: true, ao2: false }, sq2: { ao1: false, ao2: true } },
      },
    },
    { answers: { q1: { sq1: { ao1: true }, sq2: { ao1: true } } } },
    { answers: { q1: { sq1: { ao2: true } } } },
  ]

  test('counts true cells per subquestion x answer option, ignoring untouched cells', () => {
    const result = StatsAggregatorMatrixBoolean.aggregate(
      question,
      responses,
      3,
    )

    expect(result.optionStats).toEqual([])
    expect(result.matrixSubquestionStats).toHaveLength(2)

    const sq1 = result.matrixSubquestionStats!.find(
      (s) => s.subquestionCode === 'sq1',
    )!
    expect(sq1.cellStats).toEqual([
      {
        optionId: 'ao1',
        optionCode: 'ao1',
        optionLabel: { en: 'Row 1' },
        count: 2,
        percentage: 66.7,
      },
      {
        optionId: 'ao2',
        optionCode: 'ao2',
        optionLabel: { en: 'Row 2' },
        count: 1,
        percentage: 33.3,
      },
    ])

    const sq2 = result.matrixSubquestionStats!.find(
      (s) => s.subquestionCode === 'sq2',
    )!
    expect(sq2.cellStats).toEqual([
      {
        optionId: 'ao1',
        optionCode: 'ao1',
        optionLabel: { en: 'Row 1' },
        count: 1,
        percentage: 33.3,
      },
      {
        optionId: 'ao2',
        optionCode: 'ao2',
        optionLabel: { en: 'Row 2' },
        count: 1,
        percentage: 33.3,
      },
    ])
  })

  test('matrixCheckbox output carries no falseCount field', () => {
    const result = StatsAggregatorMatrixBoolean.aggregate(
      question,
      responses,
      3,
    )
    const everyCell = result.matrixSubquestionStats!.flatMap((s) => s.cellStats)
    expect(everyCell.every((cell) => cell.falseCount === undefined)).toBe(true)
  })

  test('matrixYesNo counts explicit No separately from blank', () => {
    const yesNoQuestion: StatsQuestion = { ...question, type: 'matrixYesNo' }
    const result = StatsAggregatorMatrixBoolean.aggregate(
      yesNoQuestion,
      responses,
      3,
    )

    const sq1 = result.matrixSubquestionStats!.find(
      (s) => s.subquestionCode === 'sq1',
    )!
    expect(sq1.cellStats).toEqual([
      {
        optionId: 'ao1',
        optionCode: 'ao1',
        optionLabel: { en: 'Row 1' },
        count: 2,
        percentage: 66.7,
        falseCount: 0,
      },
      {
        optionId: 'ao2',
        optionCode: 'ao2',
        optionLabel: { en: 'Row 2' },
        count: 1,
        percentage: 33.3,
        falseCount: 1,
      },
    ])
  })

  test('handles zero total responses without dividing by zero', () => {
    const result = StatsAggregatorMatrixBoolean.aggregate(question, [], 0)
    expect(
      result.matrixSubquestionStats![0].cellStats.every(
        (cell) => cell.percentage === 0,
      ),
    ).toBe(true)
  })
})
