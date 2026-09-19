import React from 'react'
import { ChartType, ChartValueMode } from 'veysur-common'

import type {
  QuestionStats,
  RankingOptionStat,
} from './model/api/SurveyStatsApi'
import {
  buildConfigFromSeries,
  buildGroupedRows,
  buildSeriesKeys,
  chartColorAt,
  getLabel,
  ordinal,
  percentOf,
  type SeriesKey,
} from './chartUtils'
import {
  ChartLegend,
  DistributionBarChart,
  GroupedBarChart,
  StatNumbersTable,
} from './chartComponents'

interface Props {
  questionStat: QuestionStats
  language: string
  chartType: ChartType
  valueMode: ChartValueMode
}

type OptionLabelOf = (stat: RankingOptionStat) => string

type RankingView = 'composition' | 'profile' | 'averageRank'

const rankingViewOf = (chartType: ChartType): RankingView =>
  chartType === 'averageRank'
    ? 'averageRank'
    : chartType === 'stackedBar'
      ? 'profile'
      : 'composition'

const VIEW_CAPTIONS: Record<RankingView, { title: string; hint: string }> = {
  composition: {
    title: 'Rank distribution',
    hint: 'How many participants placed each option at each rank position.',
  },
  profile: {
    title: 'Rank profile',
    hint: "Each option's mix of rank positions.",
  },
  averageRank: {
    title: 'Average rank',
    hint: 'Mean rank position per option (lower is ranked higher).',
  },
}

const ChartCaption: React.FC<{ view: RankingView }> = ({ view }) => (
  <div className="space-y-0.5">
    <p className="text-sm font-medium">{VIEW_CAPTIONS[view].title}</p>
    <p className="text-sm text-muted-foreground">{VIEW_CAPTIONS[view].hint}</p>
  </div>
)

// Best (lowest) average rank first; options nobody ranked sink to the bottom.
const byAverageRank = (a: RankingOptionStat, b: RankingOptionStat) => {
  if (a.averageRank === null) return 1
  if (b.averageRank === null) return -1
  return a.averageRank - b.averageRank
}

/** Selectable: one horizontal bar per option, length = mean rank. Options that
 *  nobody ranked have no average and are omitted (still listed in the table). */
const RankingAverageRankBar: React.FC<{
  sortedStats: RankingOptionStat[]
  optionLabelOf: OptionLabelOf
  colorByCode: Map<string, string>
  optionSeriesKeys: SeriesKey[]
}> = ({ sortedStats, optionLabelOf, colorByCode, optionSeriesKeys }) => (
  <DistributionBarChart
    data={sortedStats
      .filter((stat) => stat.averageRank !== null)
      .map((stat) => ({
        name: optionLabelOf(stat),
        averageRank: Number((stat.averageRank ?? 0).toFixed(2)),
        fill: colorByCode.get(stat.optionCode) ?? chartColorAt(0),
      }))}
    dataKey="averageRank"
    config={buildConfigFromSeries(optionSeriesKeys)}
    valueMode="count"
    barName="Average rank"
    horizontal
    valueLabels
  />
)

/** Always-on summary: per-rank counts, average rank and ranked-by percentage. */
const RankingNumbersTable: React.FC<{
  sortedStats: RankingOptionStat[]
  rankIndexes: number[]
  optionLabelOf: OptionLabelOf
}> = ({ sortedStats, rankIndexes, optionLabelOf }) => (
  <StatNumbersTable>
    <thead>
      <tr>
        <td className="p-1" />
        {rankIndexes.map((i) => (
          <td key={i} className="p-1 text-center whitespace-nowrap">
            {ordinal(i + 1)}
          </td>
        ))}
        <td className="p-1 text-center whitespace-nowrap">Avg rank</td>
        <td className="p-1 text-center whitespace-nowrap">Ranked by</td>
      </tr>
    </thead>
    <tbody>
      {sortedStats.map((stat) => (
        <tr key={stat.optionCode} className="border-t">
          <td className="p-1 whitespace-nowrap">{optionLabelOf(stat)}</td>
          {rankIndexes.map((i) => (
            <td key={i} className="p-1 text-center">
              {stat.rankCounts[i] ?? 0}
            </td>
          ))}
          <td className="p-1 text-center">
            {stat.averageRank === null ? '—' : stat.averageRank.toFixed(2)}
          </td>
          <td className="p-1 text-center">
            {stat.rankedPercentage.toFixed(1)}%
          </td>
        </tr>
      ))}
    </tbody>
  </StatNumbersTable>
)

/** Selectable: one 100% stacked bar per option, segments = rank positions. */
const RankingProfileChart: React.FC<{
  rankingStats: RankingOptionStat[]
  rankIndexes: number[]
  rankSeriesKeys: SeriesKey[]
  optionLabelOf: OptionLabelOf
}> = ({ rankingStats, rankIndexes, rankSeriesKeys, optionLabelOf }) => (
  <GroupedBarChart
    data={buildGroupedRows({
      categories: rankingStats,
      categoryKey: (stat) => stat.optionCode,
      categoryName: optionLabelOf,
      series: rankIndexes,
      seriesKey: (i) => `rank${i}`,
      value: (stat, i) => percentOf(stat.rankCounts[i], stat.rankedCount),
    })}
    seriesKeys={rankSeriesKeys}
    valueMode="percentage"
    horizontal
    stacked
  />
)

/** Selectable: grouped bars, rank position on the axis, one bar per option. */
const RankingCompositionChart: React.FC<{
  rankingStats: RankingOptionStat[]
  rankIndexes: number[]
  optionSeriesKeys: SeriesKey[]
  totalResponses: number
  chartType: ChartType
  valueMode: ChartValueMode
}> = ({
  rankingStats,
  rankIndexes,
  optionSeriesKeys,
  totalResponses,
  chartType,
  valueMode,
}) => (
  <GroupedBarChart
    data={buildGroupedRows({
      categories: rankIndexes,
      categoryKey: (i) => `rank${i}`,
      categoryName: (i) => ordinal(i + 1),
      series: rankingStats,
      seriesKey: (stat) => stat.optionCode,
      value: (i, stat) =>
        valueMode === 'percentage'
          ? percentOf(stat.rankCounts[i], totalResponses)
          : stat.rankCounts[i],
    })}
    seriesKeys={optionSeriesKeys}
    valueMode={valueMode}
    horizontal={chartType === 'horizontalBar'}
  />
)

/**
 * Renders Ranking question stats from the per-option rank-position matrix
 * (`rankingStats`). The numbers table is always shown. The selectable chart is
 * the rank-composition grouped bars (`bar`/`horizontalBar`, the default), the
 * per-option 100% rank profile (`stackedBar`), or the per-option mean-rank bar
 * (`averageRank`).
 */
export const SurveyStatRankingChart: React.FC<Props> = ({
  questionStat,
  language,
  chartType,
  valueMode,
}) => {
  const rankingStats = questionStat.rankingStats || []
  if (rankingStats.length === 0) return null

  const rankSlots = rankingStats[0]?.rankCounts.length || 0
  const rankIndexes = Array.from({ length: rankSlots }, (_, i) => i)

  const optionLabelOf: OptionLabelOf = (stat) =>
    getLabel(stat.optionLabel, language, stat.optionCode)

  // Options coloured by their position in the (unsorted) option list, so a
  // colour means the same option in every view here, sorted or not.
  const optionSeriesKeys = buildSeriesKeys(
    rankingStats,
    (stat) => stat.optionCode,
    optionLabelOf,
  )
  const colorByCode = new Map(
    optionSeriesKeys.map((key) => [key.key, key.color]),
  )
  const rankSeriesKeys = buildSeriesKeys(
    rankIndexes,
    (i) => `rank${i}`,
    (i) => ordinal(i + 1),
  )

  const sortedStats = [...rankingStats].sort(byAverageRank)

  const view = rankingViewOf(chartType)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <ChartCaption view={view} />

        {view === 'averageRank' ? (
          <RankingAverageRankBar
            sortedStats={sortedStats}
            optionLabelOf={optionLabelOf}
            colorByCode={colorByCode}
            optionSeriesKeys={optionSeriesKeys}
          />
        ) : view === 'profile' ? (
          <RankingProfileChart
            rankingStats={rankingStats}
            rankIndexes={rankIndexes}
            rankSeriesKeys={rankSeriesKeys}
            optionLabelOf={optionLabelOf}
          />
        ) : (
          <RankingCompositionChart
            rankingStats={rankingStats}
            rankIndexes={rankIndexes}
            optionSeriesKeys={optionSeriesKeys}
            totalResponses={questionStat.totalResponses}
            chartType={chartType}
            valueMode={valueMode}
          />
        )}

        <ChartLegend
          items={view === 'profile' ? rankSeriesKeys : optionSeriesKeys}
        />
      </div>

      <RankingNumbersTable
        sortedStats={sortedStats}
        rankIndexes={rankIndexes}
        optionLabelOf={optionLabelOf}
      />
    </div>
  )
}
