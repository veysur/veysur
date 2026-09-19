import { render, screen, fireEvent } from '@testing-library/react'

import {
  SurveyStatChart,
  resolveChartType,
  resolveValueMode,
} from './SurveyStatChart'
import type { QuestionStats } from './model/api/SurveyStatsApi'

describe('resolveChartType', () => {
  const available = ['bar', 'horizontalBar', 'pie'] as const

  it('prefers the pending local choice', () => {
    expect(resolveChartType('bar', 'pie', [...available])).toBe('pie')
  })

  it('falls back to the saved value when no local choice', () => {
    expect(resolveChartType('horizontalBar', null, [...available])).toBe(
      'horizontalBar',
    )
  })

  it('defaults to the first available type when nothing is saved', () => {
    expect(resolveChartType(undefined, null, [...available])).toBe('bar')
  })

  it('clamps a stored value that is no longer valid for this question type', () => {
    expect(resolveChartType('pie', null, ['bar', 'horizontalBar'])).toBe('bar')
  })
})

describe('resolveValueMode', () => {
  it('defaults to count when nothing is saved', () => {
    expect(resolveValueMode(undefined, null)).toBe('count')
  })

  it('uses the saved value when there is no pending local choice', () => {
    expect(resolveValueMode('percentage', null)).toBe('percentage')
  })

  it('prefers the pending local choice', () => {
    expect(resolveValueMode('count', 'percentage')).toBe('percentage')
  })
})

const choiceStat: QuestionStats = {
  questionId: 'q1',
  questionCode: 'q1',
  questionType: 'dropdown',
  questionText: { en: 'Pick one' },
  totalResponses: 3,
  optionStats: [
    {
      optionId: 'o1',
      optionCode: 'o1',
      optionLabel: { en: 'Alpha' },
      count: 2,
      percentage: 66.7,
    },
    {
      optionId: 'o2',
      optionCode: 'o2',
      optionLabel: { en: 'Beta' },
      count: 1,
      percentage: 33.3,
    },
  ],
}

const matrixNumberStat: QuestionStats = {
  questionId: 'q3',
  questionCode: 'q3',
  questionType: 'matrixNumber',
  questionText: { en: 'Scores' },
  totalResponses: 3,
  optionStats: [],
  matrixSubquestionStats: [
    {
      subquestionId: 's1',
      subquestionCode: 's1',
      subquestionText: { en: 'Row one' },
      cellStats: [
        {
          optionId: 'o1',
          optionCode: 'o1',
          optionLabel: { en: 'Value' },
          count: 3,
          percentage: 0,
          average: 4,
        },
      ],
    },
  ],
}

const openChartSettings = () =>
  fireEvent.click(screen.getByRole('button', { name: /chart settings/i }))

describe('SurveyStatChart settings popover', () => {
  it('exposes chart-type and value-mode controls for a bar choice question', () => {
    render(
      <SurveyStatChart
        questionStat={choiceStat}
        questionCode="q1"
        language="en"
      />,
    )

    openChartSettings()
    // bar (default) → chart-type select + value-mode select
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('hides the value-mode control for an average-only question type', () => {
    render(
      <SurveyStatChart
        questionStat={matrixNumberStat}
        questionCode="q3"
        language="en"
      />,
    )

    openChartSettings()
    // only the chart-type selector (bar/horizontalBar)
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })

  it('renders the matrix chart (with a settings button) for a matrix question', () => {
    const matrixStat: QuestionStats = {
      questionId: 'q2',
      questionCode: 'q2',
      questionType: 'matrixCheckbox',
      questionText: { en: 'Grid' },
      totalResponses: 2,
      optionStats: [],
      matrixSubquestionStats: [
        {
          subquestionId: 's1',
          subquestionCode: 's1',
          subquestionText: { en: 'Row one' },
          cellStats: [
            {
              optionId: 'o1',
              optionCode: 'o1',
              optionLabel: { en: 'Yes' },
              count: 1,
              percentage: 50,
            },
            {
              optionId: 'o2',
              optionCode: 'o2',
              optionLabel: { en: 'No' },
              count: 1,
              percentage: 50,
            },
          ],
        },
      ],
    }

    render(
      <SurveyStatChart
        questionStat={matrixStat}
        questionCode="q2"
        language="en"
      />,
    )

    expect(
      screen.getByRole('button', { name: /chart settings/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('1 (50.0%)').length).toBeGreaterThan(0)
  })
})
