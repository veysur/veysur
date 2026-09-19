import { render, screen } from '@testing-library/react'

import { SurveyStatRankingChart } from './SurveyStatRankingChart'
import type { QuestionStats } from './model/api/SurveyStatsApi'

const questionStat: QuestionStats = {
  questionId: 'q1',
  questionCode: 'q1',
  questionType: 'ranking',
  questionText: { en: 'Rank these' },
  totalResponses: 4,
  optionStats: [],
  rankingStats: [
    {
      optionId: 'ao1',
      optionCode: 'ao1',
      optionLabel: { en: 'Apple' },
      rankedCount: 4,
      rankedPercentage: 100,
      averageRank: 1.5,
      rankCounts: [2, 2, 0],
    },
    {
      optionId: 'ao2',
      optionCode: 'ao2',
      optionLabel: { en: 'Banana' },
      rankedCount: 3,
      rankedPercentage: 75,
      averageRank: 2.33,
      rankCounts: [1, 1, 1],
    },
    {
      optionId: 'ao3',
      optionCode: 'ao3',
      optionLabel: { en: 'Cherry' },
      rankedCount: 2,
      rankedPercentage: 50,
      averageRank: null,
      rankCounts: [1, 0, 1],
    },
  ],
}

describe('SurveyStatRankingChart', () => {
  it('renders the numbers table with per-rank counts, average rank and ranked-by', () => {
    render(
      <SurveyStatRankingChart
        questionStat={questionStat}
        language="en"
        chartType="bar"
        valueMode="count"
      />,
    )

    expect(screen.getAllByText('Apple').length).toBeGreaterThan(0)
    expect(screen.getByText('1.50')).toBeInTheDocument()
    expect(screen.getByText('2.33')).toBeInTheDocument()
    // Cherry has no average rank
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    expect(screen.getByText('Avg rank')).toBeInTheDocument()
    expect(screen.getByText('Ranked by')).toBeInTheDocument()
  })

  it('renders the distribution chart and numbers table, no average-rank bar, for the distribution chart types', () => {
    for (const chartType of ['bar', 'horizontalBar', 'stackedBar'] as const) {
      const { container, unmount } = render(
        <SurveyStatRankingChart
          questionStat={questionStat}
          language="en"
          chartType={chartType}
          valueMode="count"
        />,
      )
      expect(container.querySelectorAll('[data-chart]').length).toBe(1)
      expect(
        screen.getByText(
          chartType === 'stackedBar' ? 'Rank profile' : 'Rank distribution',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('Average rank')).not.toBeInTheDocument()
      expect(screen.getByText('Avg rank')).toBeInTheDocument()
      unmount()
    }
  })

  it('renders the average-rank bar only for the averageRank chart type', () => {
    render(
      <SurveyStatRankingChart
        questionStat={questionStat}
        language="en"
        chartType="averageRank"
        valueMode="count"
      />,
    )

    expect(screen.getByText('Average rank')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Mean rank position per option (lower is ranked higher).',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Rank distribution')).not.toBeInTheDocument()
  })

  it('returns null when there are no ranking stats', () => {
    const { container } = render(
      <SurveyStatRankingChart
        questionStat={{ ...questionStat, rankingStats: [] }}
        language="en"
        chartType="bar"
        valueMode="count"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
