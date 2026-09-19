import type { QuestionStats, MatrixCellStat } from './model/api/SurveyStatsApi'
import { percentOf } from './chartUtils'

export interface MatrixCellTextOpts {
  isNumeric: boolean
  isYesNo: boolean
}

/**
 * matrixYesNo cells carry a real third "blank" state, so each cell breaks down
 * into explicit Yes / No / not-answered counts rather than a single fraction.
 */
export const yesNoBlankBreakdown = (
  cell: MatrixCellStat | undefined,
  totalResponses: number,
) => {
  const yes = cell?.count ?? 0
  const no = cell?.falseCount ?? 0
  const blank = Math.max(totalResponses - yes - no, 0)
  return { yes, no, blank }
}

/**
 * The numbers-table cell text for one matrix cell: a numeric average, an
 * explicit `Yes: n (x%) / No: n (y%)` breakdown for matrixYesNo, or the plain
 * `count (percentage%)` selection form.
 */
export const matrixCellText = (
  cell: MatrixCellStat | undefined,
  questionStat: QuestionStats,
  opts: MatrixCellTextOpts,
): string => {
  if (opts.isNumeric) return (cell?.average ?? 0).toFixed(1)
  if (opts.isYesNo) {
    const { yes, no } = yesNoBlankBreakdown(cell, questionStat.totalResponses)
    const pct = (n: number) =>
      percentOf(n, questionStat.totalResponses).toFixed(1)
    return `Yes: ${yes} (${pct(yes)}%) / No: ${no} (${pct(no)}%)`
  }
  return `${cell?.count ?? 0} (${(cell?.percentage ?? 0).toFixed(1)}%)`
}
