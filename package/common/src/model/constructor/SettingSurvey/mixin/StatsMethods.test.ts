// cspell:ignore donut

import { SettingSurvey } from '../../SettingSurvey'

describe('SettingSurvey Stats Methods', () => {
  let surveySetting: SettingSurvey

  beforeEach(() => {
    surveySetting = new SettingSurvey({
      _id: '1',
      stats: {
        questions: {
          q1: { chartType: 'bar' },
          q2: { chartType: 'pie' },
        },
      },
    })
  })

  describe('setStatsQuestionProperty', () => {
    test('updates chartType property for existing question', () => {
      const updatedAt = surveySetting.setStatsQuestionProperty(
        'q1',
        'chartType',
        'horizontalBar',
      )

      expect(updatedAt).not.toBe(surveySetting)
      expect(updatedAt.stats.questions['q1'].chartType).toBe('horizontalBar')
      expect(surveySetting.stats.questions['q1'].chartType).toBe('bar')
    })

    test('creates new question entry if not exists', () => {
      const updatedAt = surveySetting.setStatsQuestionProperty(
        'q3',
        'chartType',
        'pie',
      )

      expect(updatedAt).not.toBe(surveySetting)
      expect(updatedAt.stats.questions['q3'].chartType).toBe('pie')
      expect(surveySetting.stats.questions['q3']).toBeUndefined()
    })

    test('returns same instance if setting to current value', () => {
      const updatedAt = surveySetting.setStatsQuestionProperty(
        'q1',
        'chartType',
        'bar',
      )

      expect(updatedAt).toBe(surveySetting)
    })

    test('preserves other question settings', () => {
      const updatedAt = surveySetting.setStatsQuestionProperty(
        'q1',
        'chartType',
        'pie',
      )

      expect(updatedAt.stats.questions['q2'].chartType).toBe('pie')
    })
  })

  describe('updateStatsQuestion', () => {
    test('updates multiple properties at once', () => {
      const updates = { chartType: 'horizontalBar' }
      const updatedAt = surveySetting.updateStatsQuestion('q1', updates)

      expect(updatedAt).not.toBe(surveySetting)
      expect(updatedAt.stats.questions['q1'].chartType).toBe('horizontalBar')
    })

    test('returns same instance if no changes', () => {
      const updates = { chartType: 'bar' }
      const updatedAt = surveySetting.updateStatsQuestion('q1', updates)

      expect(updatedAt).toBe(surveySetting)
    })

    test('handles empty updates object', () => {
      const updatedAt = surveySetting.updateStatsQuestion('q1', {})

      expect(updatedAt).toBe(surveySetting)
    })

    test('creates new question if not exists', () => {
      const updates = { chartType: 'bar' }
      const updatedAt = surveySetting.updateStatsQuestion('q3', updates)

      expect(updatedAt).not.toBe(surveySetting)
      expect(updatedAt.stats.questions['q3'].chartType).toBe('bar')
    })
  })

  describe('setStatsQuestionChartType', () => {
    test('updates chart type using convenience method', () => {
      const updatedAt = surveySetting.setStatsQuestionChartType(
        'q1',
        'horizontalBar',
      )

      expect(updatedAt).not.toBe(surveySetting)
      expect(updatedAt.stats.questions['q1'].chartType).toBe('horizontalBar')
    })

    test('supports all chart types', () => {
      const updated1 = surveySetting.setStatsQuestionChartType('q1', 'bar')
      const updated2 = surveySetting.setStatsQuestionChartType(
        'q1',
        'horizontalBar',
      )
      const updated3 = surveySetting.setStatsQuestionChartType('q1', 'pie')
      const updated4 = surveySetting.setStatsQuestionChartType(
        'q1',
        'stackedBar',
      )
      const updated5 = surveySetting.setStatsQuestionChartType('q1', 'pieGrid')

      expect(updated1.stats.questions['q1'].chartType).toBe('bar')
      expect(updated2.stats.questions['q1'].chartType).toBe('horizontalBar')
      expect(updated3.stats.questions['q1'].chartType).toBe('pie')
      expect(updated4.stats.questions['q1'].chartType).toBe('stackedBar')
      expect(updated5.stats.questions['q1'].chartType).toBe('pieGrid')
    })

    test('ignores an unrecognised chart type', () => {
      const updatedAt = surveySetting.setStatsQuestionChartType(
        'q1',
        'donut' as never,
      )

      expect(updatedAt).toBe(surveySetting)
      expect(surveySetting.stats.questions['q1'].chartType).toBe('bar')
    })

    test('creates new question if not exists', () => {
      const updatedAt = surveySetting.setStatsQuestionChartType('q3', 'pie')

      expect(updatedAt).not.toBe(surveySetting)
      expect(updatedAt.stats.questions['q3'].chartType).toBe('pie')
      expect(surveySetting.stats.questions['q3']).toBeUndefined()
    })
  })

  describe('setStatsQuestionValueMode', () => {
    test('sets the value mode without disturbing chartType', () => {
      const updated = surveySetting
        .setStatsQuestionChartType('q1', 'bar')
        .setStatsQuestionValueMode('q1', 'percentage')

      expect(updated.stats.questions['q1']).toEqual({
        chartType: 'bar',
        valueMode: 'percentage',
      })
      expect(surveySetting.stats.questions['q1'].valueMode).toBeUndefined()
    })

    test('supports both value modes', () => {
      const count = surveySetting.setStatsQuestionValueMode('q1', 'count')
      const percentage = surveySetting.setStatsQuestionValueMode(
        'q1',
        'percentage',
      )

      expect(count.stats.questions['q1'].valueMode).toBe('count')
      expect(percentage.stats.questions['q1'].valueMode).toBe('percentage')
    })

    test('ignores an unrecognised value mode', () => {
      const updated = surveySetting.setStatsQuestionValueMode(
        'q1',
        'fraction' as never,
      )

      expect(updated).toBe(surveySetting)
    })
  })

  describe('method chaining', () => {
    test('methods can be chained together', () => {
      const updatedAt = surveySetting
        .setStatsQuestionChartType('q1', 'horizontalBar')
        .setStatsQuestionChartType('q2', 'bar')
        .setStatsQuestionChartType('q3', 'pie')

      expect(updatedAt.stats.questions['q1'].chartType).toBe('horizontalBar')
      expect(updatedAt.stats.questions['q2'].chartType).toBe('bar')
      expect(updatedAt.stats.questions['q3'].chartType).toBe('pie')
    })

    test('immutability is maintained through chaining', () => {
      const updatedAt = surveySetting
        .setStatsQuestionChartType('q1', 'pie')
        .setStatsQuestionChartType('q2', 'horizontalBar')

      expect(surveySetting.stats.questions['q1'].chartType).toBe('bar')
      expect(surveySetting.stats.questions['q2'].chartType).toBe('pie')
      expect(updatedAt.stats.questions['q1'].chartType).toBe('pie')
      expect(updatedAt.stats.questions['q2'].chartType).toBe('horizontalBar')
    })
  })

  describe('integration with schema defaults', () => {
    test('works with schema default stats structure', () => {
      const minimal = new SettingSurvey({
        _id: '1',
      })

      expect(minimal.stats.questions).toEqual({})
    })

    test('can modify schema defaults', () => {
      const minimal = new SettingSurvey({
        _id: '1',
      })

      const updatedAt = minimal
        .setStatsQuestionChartType('q1', 'bar')
        .setStatsQuestionChartType('q2', 'pie')

      expect(updatedAt.stats.questions['q1'].chartType).toBe('bar')
      expect(updatedAt.stats.questions['q2'].chartType).toBe('pie')
    })

    test('preserves stats when updating other properties', () => {
      const updatedAt = surveySetting.setPresentationProperty('stats', true)

      expect(updatedAt.stats.questions['q1'].chartType).toBe('bar')
      expect(updatedAt.stats.questions['q2'].chartType).toBe('pie')
    })
  })
})
