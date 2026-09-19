import { render, screen } from '@testing-library/react'

import { SurveyStatMatrixChart } from './SurveyStatMatrixChart'
import type { QuestionStats } from './model/api/SurveyStatsApi'

const questionStat: QuestionStats = {
  questionId: 'q1',
  questionCode: 'q1',
  questionType: 'matrixYesNo',
  questionText: { en: 'Matrix question' },
  totalResponses: 4,
  optionStats: [],
  matrixSubquestionStats: [
    {
      subquestionId: 'sq1',
      subquestionCode: 'sq1',
      subquestionText: { en: 'Column A' },
      cellStats: [
        {
          optionId: 'ao1',
          optionCode: 'ao1',
          optionLabel: { en: 'Speed' },
          count: 2,
          percentage: 50,
          falseCount: 1,
        },
        {
          optionId: 'ao2',
          optionCode: 'ao2',
          optionLabel: { en: 'Value' },
          count: 2,
          percentage: 50,
          falseCount: 2,
        },
      ],
    },
    {
      subquestionId: 'sq2',
      subquestionCode: 'sq2',
      subquestionText: { en: 'Column B' },
      cellStats: [
        {
          optionId: 'ao1',
          optionCode: 'ao1',
          optionLabel: { en: 'Speed' },
          count: 1,
          percentage: 25,
          falseCount: 3,
        },
        {
          optionId: 'ao2',
          optionCode: 'ao2',
          optionLabel: { en: 'Value' },
          count: 3,
          percentage: 75,
          falseCount: 1,
        },
      ],
    },
  ],
}

describe('SurveyStatMatrixChart', () => {
  it('shows an explicit Yes and No breakdown per cell for matrixYesNo', () => {
    for (const chartType of [
      'bar',
      'horizontalBar',
      'stackedBar',
      'pieGrid',
    ] as const) {
      const { unmount } = render(
        <SurveyStatMatrixChart
          questionStat={questionStat}
          questionCode="q1"
          language="en"
          chartType={chartType}
          valueMode="count"
        />,
      )
      expect(
        screen.getAllByText('Yes: 2 (50.0%) / No: 1 (25.0%)').length,
      ).toBeGreaterThan(0)
      expect(
        screen.getByText('Yes: 3 (75.0%) / No: 1 (25.0%)'),
      ).toBeInTheDocument()
      unmount()
    }
  })

  it('renders bar charts in both value modes without error', () => {
    for (const valueMode of ['count', 'percentage'] as const) {
      const { container, unmount } = render(
        <SurveyStatMatrixChart
          questionStat={questionStat}
          questionCode="q1"
          language="en"
          chartType="bar"
          valueMode={valueMode}
        />,
      )
      expect(container.querySelectorAll('[data-chart]').length).toBeGreaterThan(
        0,
      )
      unmount()
    }
  })

  it('renders one Yes/No/Not answered pie per matrix cell for pieGrid', () => {
    render(
      <SurveyStatMatrixChart
        questionStat={questionStat}
        questionCode="q1"
        language="en"
        chartType="pieGrid"
        valueMode="count"
      />,
    )

    expect(screen.getByText('Column A – Speed')).toBeInTheDocument()
    expect(screen.getByText('Column B – Value')).toBeInTheDocument()
    expect(screen.getAllByText('Not answered').length).toBeGreaterThan(0)
  })

  it('keeps the single-count cell format for non-yes/no matrix types', () => {
    const checkboxStat: QuestionStats = {
      ...questionStat,
      questionType: 'matrixCheckbox',
      matrixSubquestionStats: [
        {
          ...questionStat.matrixSubquestionStats![0],
          cellStats: [
            {
              optionId: 'ao1',
              optionCode: 'ao1',
              optionLabel: { en: 'Speed' },
              count: 3,
              percentage: 75,
            },
          ],
        },
      ],
    }

    render(
      <SurveyStatMatrixChart
        questionStat={checkboxStat}
        questionCode="q1"
        language="en"
        chartType="bar"
        valueMode="count"
      />,
    )

    expect(screen.getByText('3 (75.0%)')).toBeInTheDocument()
  })

  it('renders averages for matrixNumber questions instead of counts', () => {
    const numericStat: QuestionStats = {
      ...questionStat,
      questionType: 'matrixNumber',
      matrixSubquestionStats: [
        {
          ...questionStat.matrixSubquestionStats![0],
          cellStats: [
            {
              optionId: 'ao1',
              optionCode: 'ao1',
              optionLabel: { en: 'Row 1' },
              count: 2,
              percentage: 0,
              average: 3.5,
            },
          ],
        },
      ],
    }

    render(
      <SurveyStatMatrixChart
        questionStat={numericStat}
        questionCode="q1"
        language="en"
        chartType="bar"
        valueMode="count"
      />,
    )

    expect(screen.getByText('3.5')).toBeInTheDocument()
  })
})
