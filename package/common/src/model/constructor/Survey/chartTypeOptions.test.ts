import {
  ALL_CHART_TYPES,
  ALL_CHART_VALUE_MODES,
} from '../SettingSurvey/SettingSurveyBase'
import {
  getAvailableChartTypes,
  CHART_TYPE_LABELS,
  CHART_VALUE_MODE_LABELS,
  chartTypeUsesValueMode,
  questionTypeHasValueModeData,
} from './chartTypeOptions'

describe('getAvailableChartTypes', () => {
  const cases: Array<[string, string[]]> = [
    ['dropdown', ['bar', 'horizontalBar', 'pie']],
    ['button', ['bar', 'horizontalBar', 'pie']],
    ['imageSelect', ['bar', 'horizontalBar', 'pie']],
    ['yesNo', ['bar', 'horizontalBar', 'pie']],
    ['starRating', ['bar', 'horizontalBar', 'pie']],
    ['point5', ['bar', 'horizontalBar', 'pie']],
    ['point10', ['bar', 'horizontalBar', 'pie']],
    ['checkbox', ['bar', 'horizontalBar']],
    ['matrixYesNo', ['bar', 'horizontalBar', 'stackedBar', 'pieGrid']],
    ['matrixCheckbox', ['bar', 'horizontalBar']],
    ['matrixNumber', ['bar', 'horizontalBar']],
    ['multiPartYesNo', ['bar', 'horizontalBar', 'stackedBar', 'pieGrid']],
    ['multiPartStarRating', ['bar', 'horizontalBar', 'stackedBar', 'pieGrid']],
    ['multiPartPoint5', ['bar', 'horizontalBar', 'stackedBar', 'pieGrid']],
    ['multiPartPoint10', ['bar', 'horizontalBar', 'stackedBar', 'pieGrid']],
    ['multiPartNumber', ['bar', 'horizontalBar']],
    ['text', ['bar', 'horizontalBar']],
    ['ranking', ['bar', 'horizontalBar', 'stackedBar', 'averageRank']],
    ['somethingUnknown', ['bar', 'horizontalBar']],
  ]

  test.each(cases)('%s → %j', (questionType, expected) => {
    expect(getAvailableChartTypes(questionType)).toEqual(expected)
  })

  test('checkbox never offers pie', () => {
    expect(getAvailableChartTypes('checkbox')).not.toContain('pie')
  })

  test('every returned value is a known chart type, with bar first', () => {
    for (const [questionType] of cases) {
      const result = getAvailableChartTypes(questionType)
      expect(result[0]).toBe('bar')
      for (const value of result) {
        expect(ALL_CHART_TYPES).toContain(value)
      }
    }
  })

  test('CHART_TYPE_LABELS covers every chart type', () => {
    for (const type of ALL_CHART_TYPES) {
      expect(CHART_TYPE_LABELS[type]).toBeTruthy()
    }
  })
})

describe('value-mode helpers', () => {
  test('chartTypeUsesValueMode is true only for the plain bar orientations', () => {
    expect(chartTypeUsesValueMode('bar')).toBe(true)
    expect(chartTypeUsesValueMode('horizontalBar')).toBe(true)
    expect(chartTypeUsesValueMode('stackedBar')).toBe(false)
    expect(chartTypeUsesValueMode('pie')).toBe(false)
    expect(chartTypeUsesValueMode('pieGrid')).toBe(false)
    expect(chartTypeUsesValueMode('averageRank')).toBe(false)
  })

  test('questionTypeHasValueModeData is false for average-only types', () => {
    expect(questionTypeHasValueModeData('matrixNumber')).toBe(false)
    expect(questionTypeHasValueModeData('multiPartNumber')).toBe(false)
    expect(questionTypeHasValueModeData('matrixYesNo')).toBe(true)
    expect(questionTypeHasValueModeData('dropdown')).toBe(true)
  })

  test('CHART_VALUE_MODE_LABELS covers every value mode', () => {
    for (const mode of ALL_CHART_VALUE_MODES) {
      expect(CHART_VALUE_MODE_LABELS[mode]).toBeTruthy()
    }
  })
})
