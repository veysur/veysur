import { matrixCellText, yesNoBlankBreakdown } from './matrixChartUtils'
import type { QuestionStats } from './model/api/SurveyStatsApi'

const questionStat = { totalResponses: 4 } as QuestionStats

describe('matrixCellText', () => {
  it('formats a numeric average to one decimal place', () => {
    expect(
      matrixCellText({ average: 3.5 } as never, questionStat, {
        isNumeric: true,
        isYesNo: false,
      }),
    ).toBe('3.5')
  })

  it('formats a real zero numeric average', () => {
    expect(
      matrixCellText({ average: 0 } as never, questionStat, {
        isNumeric: true,
        isYesNo: false,
      }),
    ).toBe('0.0')
  })

  it('formats a yes/no breakdown with percentages', () => {
    expect(
      matrixCellText({ count: 2, falseCount: 1 } as never, questionStat, {
        isNumeric: false,
        isYesNo: true,
      }),
    ).toBe('Yes: 2 (50.0%) / No: 1 (25.0%)')
  })

  it('formats a selection count with percentage', () => {
    expect(
      matrixCellText({ count: 3, percentage: 75 } as never, questionStat, {
        isNumeric: false,
        isYesNo: false,
      }),
    ).toBe('3 (75.0%)')
  })
})

describe('yesNoBlankBreakdown', () => {
  it('derives blank from the remaining responses', () => {
    expect(
      yesNoBlankBreakdown({ count: 2, falseCount: 1 } as never, 4),
    ).toEqual({
      yes: 2,
      no: 1,
      blank: 1,
    })
  })

  it('never returns a negative blank count', () => {
    expect(
      yesNoBlankBreakdown({ count: 3, falseCount: 3 } as never, 4),
    ).toEqual({
      yes: 3,
      no: 3,
      blank: 0,
    })
  })
})
