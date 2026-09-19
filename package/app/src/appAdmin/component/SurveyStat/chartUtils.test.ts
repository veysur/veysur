import {
  buildGroupedRows,
  buildOptionSeries,
  buildSeriesKeys,
  chartColorAt,
  clampChartType,
  percentTickFormatter,
} from './chartUtils'

describe('buildSeriesKeys', () => {
  it('maps each item to a key/label/colour indexed by position', () => {
    expect(
      buildSeriesKeys(
        [
          { c: 'a', t: 'Alpha' },
          { c: 'b', t: 'Beta' },
        ],
        (i) => i.c,
        (i) => i.t,
      ),
    ).toEqual([
      { key: 'a', label: 'Alpha', color: chartColorAt(0) },
      { key: 'b', label: 'Beta', color: chartColorAt(1) },
    ])
  })
})
import type { OptionStat } from './model/api/SurveyStatsApi'

describe('clampChartType', () => {
  const available = ['bar', 'horizontalBar'] as const

  it('keeps a candidate that is still valid for the question type', () => {
    expect(clampChartType('horizontalBar', [...available])).toBe(
      'horizontalBar',
    )
  })

  it('falls back to the first available type for a stale stored value', () => {
    expect(clampChartType('pie', [...available])).toBe('bar')
  })

  it('falls back to the first available type when nothing is stored', () => {
    expect(clampChartType(undefined, [...available])).toBe('bar')
  })
})

describe('buildOptionSeries', () => {
  const optionStats: OptionStat[] = [
    {
      optionId: 'o1',
      optionCode: 'o1',
      optionLabel: { en: 'Alpha', de: 'Alpha DE' },
      count: 3,
      percentage: 60,
    },
    {
      optionId: 'o2',
      optionCode: 'o2',
      optionLabel: { en: 'Beta' },
      count: 2,
      percentage: 40,
    },
  ]

  it('maps each option to a datum with a stable colour by position', () => {
    const result = buildOptionSeries(optionStats, 'en')
    expect(result).toEqual([
      {
        key: 'o1',
        name: 'Alpha',
        count: 3,
        percentage: 60,
        fill: chartColorAt(0),
      },
      {
        key: 'o2',
        name: 'Beta',
        count: 2,
        percentage: 40,
        fill: chartColorAt(1),
      },
    ])
  })

  it('resolves labels in the requested language', () => {
    expect(buildOptionSeries(optionStats, 'de')[0].name).toBe('Alpha DE')
  })
})

describe('percentTickFormatter', () => {
  it('appends % in percentage mode', () => {
    expect(percentTickFormatter('percentage')(40)).toBe('40%')
  })

  it('leaves counts untouched', () => {
    expect(percentTickFormatter('count')(40)).toBe('40')
  })
})

describe('buildGroupedRows', () => {
  it('produces one row per category with a field per series', () => {
    const rows = buildGroupedRows({
      categories: ['Yes', 'No'],
      categoryKey: (c) => c,
      categoryName: (c) => c,
      series: ['partA', 'partB'],
      seriesKey: (s) => s,
      value: (category, series) =>
        category === 'Yes' && series === 'partA' ? 100 : 0,
    })

    expect(rows).toEqual([
      { name: 'Yes', partA: 100, partB: 0 },
      { name: 'No', partA: 0, partB: 0 },
    ])
  })
})
