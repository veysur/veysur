import { render, screen } from '@testing-library/react'

import { SurveyStatMultiPartChart } from './SurveyStatMultiPartChart'
import type { QuestionStats } from './model/api/SurveyStatsApi'

const choiceStat: QuestionStats = {
  questionId: 'q1',
  questionCode: 'q1',
  questionType: 'multiPartYesNo',
  questionText: { en: 'Multi part' },
  totalResponses: 4,
  optionStats: [],
  multiPartStats: [
    {
      partId: 'p1',
      partCode: 'p1',
      partText: { en: 'Part one' },
      partType: 'yesNo',
      optionStats: [
        {
          optionId: 'o1',
          optionCode: 'o1',
          optionLabel: { en: 'Yes' },
          count: 3,
          percentage: 75,
        },
        {
          optionId: 'o2',
          optionCode: 'o2',
          optionLabel: { en: 'No' },
          count: 1,
          percentage: 25,
        },
      ],
    },
    {
      partId: 'p2',
      partCode: 'p2',
      partText: { en: 'Part two' },
      partType: 'yesNo',
      optionStats: [
        {
          optionId: 'o1',
          optionCode: 'o1',
          optionLabel: { en: 'Yes' },
          count: 2,
          percentage: 50,
        },
        {
          optionId: 'o2',
          optionCode: 'o2',
          optionLabel: { en: 'No' },
          count: 2,
          percentage: 50,
        },
      ],
    },
  ],
}

describe('SurveyStatMultiPartChart', () => {
  it('renders every choice chart type without error', () => {
    for (const chartType of [
      'bar',
      'horizontalBar',
      'stackedBar',
      'pieGrid',
    ] as const) {
      const { container, unmount } = render(
        <SurveyStatMultiPartChart
          questionStat={choiceStat}
          language="en"
          chartType={chartType}
          valueMode="count"
        />,
      )
      expect(container.querySelectorAll('[data-chart]').length).toBeGreaterThan(
        0,
      )
      unmount()
    }
  })

  it('renders grouped bars in both value modes without error', () => {
    for (const valueMode of ['count', 'percentage'] as const) {
      const { container, unmount } = render(
        <SurveyStatMultiPartChart
          questionStat={choiceStat}
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

  it('shows one pie caption per part for pieGrid', () => {
    render(
      <SurveyStatMultiPartChart
        questionStat={choiceStat}
        language="en"
        chartType="pieGrid"
        valueMode="count"
      />,
    )
    expect(screen.getByText('Part one')).toBeInTheDocument()
    expect(screen.getByText('Part two')).toBeInTheDocument()
  })

  it('renders averages for a numeric multi-part question', () => {
    const numericStat: QuestionStats = {
      ...choiceStat,
      questionType: 'multiPartNumber',
      multiPartStats: [
        {
          partId: 'p1',
          partCode: 'p1',
          partText: { en: 'Score' },
          partType: 'number',
          optionStats: [],
          average: 4.2,
        },
      ],
    }

    render(
      <SurveyStatMultiPartChart
        questionStat={numericStat}
        language="en"
        chartType="bar"
        valueMode="count"
      />,
    )
    expect(screen.getByText('4.2 average')).toBeInTheDocument()
  })
})
