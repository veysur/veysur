import React from 'react'

import type { QuestionStats } from './model/api/SurveyStatsApi'
import { percentOf, yesNoBlankSeries } from './chartUtils'
import { yesNoBlankBreakdown } from './matrixChartUtils'
import { ChartLegend, GroupedBarChart, PieGridChart } from './chartComponents'

interface Props {
  questionStat: QuestionStats
  chartType: 'pieGrid' | 'stackedBar'
  optionLabel: (optionCode: string) => string
  subquestionLabel: (
    subquestionCode: string,
    subquestionText?: { [lang: string]: string },
  ) => string
  numbersTable: React.ReactNode
}

/**
 * matrixYesNo pie-grid / stacked-bar rendering: one Yes / No / not-answered
 * breakdown per matrix cell.
 */
export const MatrixYesNoBreakdown: React.FC<Props> = ({
  questionStat,
  chartType,
  optionLabel,
  subquestionLabel,
  numbersTable,
}) => {
  const subquestionStats = questionStat.matrixSubquestionStats || []
  const total = questionStat.totalResponses
  const yesNoCells = subquestionStats.flatMap((subquestion) =>
    subquestion.cellStats.map((cell) => {
      const { yes, no, blank } = yesNoBlankBreakdown(cell, total)
      return {
        key: `${subquestion.subquestionCode}-${cell.optionCode}`,
        caption: `${subquestionLabel(
          subquestion.subquestionCode,
          subquestion.subquestionText,
        )} – ${optionLabel(cell.optionCode)}`,
        yes: percentOf(yes, total),
        no: percentOf(no, total),
        blank: percentOf(blank, total),
      }
    }),
  )

  return (
    <div className="space-y-4">
      {chartType === 'pieGrid' ? (
        <PieGridChart
          cells={yesNoCells.map((cell) => ({
            key: cell.key,
            caption: cell.caption,
            slices: yesNoBlankSeries.map((series) => ({
              name: series.label,
              value: cell[series.key as 'yes' | 'no' | 'blank'],
              fill: series.color,
            })),
          }))}
        />
      ) : (
        <GroupedBarChart
          data={yesNoCells.map((cell) => ({
            name: cell.caption,
            yes: cell.yes,
            no: cell.no,
            blank: cell.blank,
          }))}
          seriesKeys={yesNoBlankSeries}
          valueMode="percentage"
          horizontal
          stacked
        />
      )}
      <ChartLegend items={yesNoBlankSeries} />
      {numbersTable}
    </div>
  )
}
