import type { ChartType, ChartValueMode } from 'veysur-common'

import type { ChartConfig } from 'component/shadcn/chart'

import type { OptionStat } from './model/api/SurveyStatsApi'

export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#14b8a6', // teal
]

export const chartColorAt = (index: number) =>
  CHART_COLORS[index % CHART_COLORS.length]

/**
 * Semantic status palette for yes/no-style questions: positive / negative /
 * not-answered. Kept alongside `CHART_COLORS` (same hardcoded-hex convention) so
 * every stat component that renders a yes/no breakdown shares one set of colours.
 */
export const STATUS_COLORS = {
  positive: CHART_COLORS[1], // green  — "Yes"
  negative: CHART_COLORS[3], // red    — "No"
  blank: '#cbd5e1', // slate-300 — "Not answered"
}

export const yesNoBlankSeries: SeriesKey[] = [
  { key: 'yes', label: 'Yes', color: STATUS_COLORS.positive },
  { key: 'no', label: 'No', color: STATUS_COLORS.negative },
  { key: 'blank', label: 'Not answered', color: STATUS_COLORS.blank },
]

/**
 * A ratio as a percentage rounded to one decimal place, guarding against a
 * zero denominator. Mirrors the API's `statsPercent.percentOf` so both sides
 * round the same way.
 */
export const percentOf = (count: number, total: number): number =>
  total > 0 ? Math.round((count / total) * 1000) / 10 : 0

/**
 * Axis tick formatter that appends `%` in percentage mode and leaves counts
 * untouched. Pass the result straight to a Recharts `tickFormatter`.
 */
export const percentTickFormatter =
  (valueMode: ChartValueMode) => (value: number | string) =>
    valueMode === 'percentage' ? `${value}%` : `${value}`

/**
 * Clamp a candidate chart type to the set a question type currently supports,
 * falling back to the first available type. A stored value can be stale after
 * a question-type change, and both the chart and its card need the same rule.
 */
export function clampChartType(
  candidate: ChartType | null | undefined,
  available: ChartType[],
): ChartType {
  return candidate && available.includes(candidate) ? candidate : available[0]
}

/**
 * English ordinal for a positive integer: 1 -> "1st", 2 -> "2nd", 11 -> "11th".
 */
export const ordinal = (n: number): string => {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

export const getLabel = (
  labelObject: { [lang: string]: string } | undefined,
  language: string,
  fallback: string,
) => labelObject?.[language] || labelObject?.['en'] || fallback

export interface OptionDatum {
  key: string
  name: string
  count: number
  percentage: number
  fill: string
}

/**
 * One row per answer option for a single-series distribution chart
 * (`SurveyStatChart`), with a stable colour assigned by option position.
 */
export function buildOptionSeries(
  optionStats: OptionStat[],
  language: string,
): OptionDatum[] {
  return optionStats.map((option, index) => ({
    key: option.optionCode || option.optionId,
    name: getLabel(option.optionLabel, language, option.optionCode),
    count: option.count,
    percentage: option.percentage,
    fill: chartColorAt(index),
  }))
}

export interface SeriesKey {
  key: string
  label: string
  color: string
}

/**
 * One `SeriesKey` per item, colour assigned by position. Doubles as a legend
 * source - `SeriesKey` is structurally a `LegendItem` too. Used by the matrix
 * and multi-part charts, which build several of these per render.
 */
export function buildSeriesKeys<T>(
  items: T[],
  keyOf: (item: T) => string,
  labelOf: (item: T) => string,
): SeriesKey[] {
  return items.map((item, index) => ({
    key: keyOf(item),
    label: labelOf(item),
    color: chartColorAt(index),
  }))
}

export function buildConfigFromSeries(series: SeriesKey[]): ChartConfig {
  return series.reduce((acc, item) => {
    acc[item.key] = { label: item.label, color: item.color }
    return acc
  }, {} as ChartConfig)
}

/**
 * Grouped/stacked chart rows: one row per category, one numeric field per
 * series. Used by the matrix and multi-part charts, which plot a
 * subquestion/part against an answer-option axis (either orientation).
 */
export function buildGroupedRows<C, S>(params: {
  categories: C[]
  categoryKey: (category: C) => string
  categoryName: (category: C) => string
  series: S[]
  seriesKey: (series: S) => string
  value: (category: C, series: S) => number
}): Array<Record<string, string | number>> {
  const { categories, categoryName, series, seriesKey, value } = params
  return categories.map((category) => {
    const row: Record<string, string | number> = {
      name: categoryName(category),
    }
    series.forEach((s) => {
      row[seriesKey(s)] = value(category, s)
    })
    return row
  })
}
