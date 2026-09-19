import React from 'react'
import {
  ChartType,
  ChartValueMode,
  QUESTION_TYPE_MULTI_PART_NUMBER,
} from 'veysur-common'

import type { QuestionStats, MultiPartStat } from './model/api/SurveyStatsApi'
import {
  buildConfigFromSeries,
  buildGroupedRows,
  buildSeriesKeys,
  chartColorAt,
  getLabel,
} from './chartUtils'
import {
  ChartLegend,
  DistributionBarChart,
  GroupedBarChart,
  PieGridChart,
  StatSummaryGrid,
} from './chartComponents'

interface Props {
  questionStat: QuestionStats
  language: string
  chartType: ChartType
  valueMode: ChartValueMode
}

/**
 * Renders Multi-Part question stats. Each part is treated as a standalone
 * question of its enforced type; the choice-shaped parts share one chart with
 * parts as the series (Multi-Part has no answer-option axis of its own).
 */
export const SurveyStatMultiPartChart: React.FC<Props> = ({
  questionStat,
  language,
  chartType,
  valueMode,
}) => {
  const isNumeric =
    questionStat.questionType === QUESTION_TYPE_MULTI_PART_NUMBER
  const parts = questionStat.multiPartStats || []

  const partLabel = (part: MultiPartStat) =>
    getLabel(part.partText, language, part.partCode)

  const partSeriesKeys = buildSeriesKeys(
    parts,
    (part) => part.partCode,
    partLabel,
  )

  // --- Numeric parts: a single average bar ------------------------------
  if (isNumeric) {
    const chartData = parts.map((part, index) => ({
      name: partLabel(part),
      average: part.average ?? 0,
      fill: chartColorAt(index),
    }))

    return (
      <div className="space-y-4">
        <DistributionBarChart
          data={chartData}
          dataKey="average"
          config={buildConfigFromSeries(partSeriesKeys)}
          valueMode="count"
          barName="Average"
          horizontal={chartType === 'horizontalBar'}
        />

        <StatSummaryGrid
          items={parts.map((part) => ({
            key: part.partId,
            label: partLabel(part),
            value: `${(part.average ?? 0).toFixed(1)} average`,
          }))}
        />
      </div>
    )
  }

  // --- Choice-shaped parts (yesNo, starRating, point5, point10) ----------
  const optionCodes = parts[0]?.optionStats.map((o) => o.optionCode) || []

  const optionLabel = (optionCode: string) =>
    getLabel(
      parts[0]?.optionStats.find((o) => o.optionCode === optionCode)
        ?.optionLabel,
      language,
      optionCode,
    )

  const optionPercentage = (part: MultiPartStat, optionCode: string) =>
    part.optionStats.find((o) => o.optionCode === optionCode)?.percentage ?? 0

  // Value for the grouped bar charts: counts or percentages per `valueMode`.
  const optionValue = (part: MultiPartStat, optionCode: string) => {
    const option = part.optionStats.find((o) => o.optionCode === optionCode)
    if (!option) return 0
    return valueMode === 'percentage' ? option.percentage : option.count
  }

  const optionSeriesKeys = buildSeriesKeys(
    optionCodes,
    (optionCode) => optionCode,
    optionLabel,
  )

  // --- Pie grid: one pie per part, slices = answer options --------------
  if (chartType === 'pieGrid') {
    return (
      <div className="space-y-4">
        <PieGridChart
          cells={parts.map((part) => ({
            key: part.partCode,
            caption: partLabel(part),
            slices: optionCodes.map((optionCode, index) => ({
              name: optionLabel(optionCode),
              value: optionPercentage(part, optionCode),
              fill: chartColorAt(index),
            })),
          }))}
        />
        <ChartLegend items={optionSeriesKeys} />
      </div>
    )
  }

  // --- Stacked bar: part rows, answer-option segments, 100% -------------
  if (chartType === 'stackedBar') {
    const chartData = buildGroupedRows({
      categories: parts,
      categoryKey: (part) => part.partCode,
      categoryName: (part) => partLabel(part),
      series: optionCodes,
      seriesKey: (optionCode) => optionCode,
      value: (part, optionCode) => optionPercentage(part, optionCode),
    })

    return (
      <div className="space-y-4">
        <GroupedBarChart
          data={chartData}
          seriesKeys={optionSeriesKeys}
          valueMode="percentage"
          horizontal
          stacked
        />
        <ChartLegend items={optionSeriesKeys} />
      </div>
    )
  }

  // --- Grouped bar / horizontal bar: parts as series ------------------
  const chartData = buildGroupedRows({
    categories: optionCodes,
    categoryKey: (optionCode) => optionCode,
    categoryName: (optionCode) => optionLabel(optionCode),
    series: parts,
    seriesKey: (part) => part.partCode,
    value: (optionCode, part) => optionValue(part, optionCode),
  })

  return (
    <div className="space-y-4">
      <GroupedBarChart
        data={chartData}
        seriesKeys={partSeriesKeys}
        valueMode={valueMode}
        horizontal={chartType === 'horizontalBar'}
      />
      <ChartLegend items={partSeriesKeys} />
    </div>
  )
}
