import { render, screen } from '@testing-library/react'
import { SurveyQuestion } from 'veysur-common'

import { RatingScaleLabelsHeader } from './RatingScaleLabelsHeader'

function buildQuestion(labels: Record<number, string> = {}): SurveyQuestion {
  const answerOptions = Array.from({ length: 5 }, (_, index) => ({
    _id: `a${index + 1}`,
    code: `P${index + 1}`,
    label: { getLang: () => labels[index + 1] ?? '' },
  }))
  return { _id: 'q1', code: 'Q1', answerOptions } as unknown as SurveyQuestion
}

const baseProps = {
  lang: 'en',
  langDefault: 'en',
  pointCount: 5,
  columnWidth: '4.5rem',
  gapClassName: 'gap-2',
}

describe('RatingScaleLabelsHeader', () => {
  it('renders each provided label once, in point order', () => {
    render(
      <RatingScaleLabelsHeader
        {...baseProps}
        question={buildQuestion({
          1: 'Strongly disagree',
          3: 'Neutral',
          5: 'Strongly agree',
        })}
      />,
    )

    const header = screen.getByTestId('rating-scale-labels-header')
    const labels = Array.from(header.children).map((child) =>
      child.textContent?.trim(),
    )
    expect(labels).toEqual([
      'Strongly disagree',
      '',
      'Neutral',
      '',
      'Strongly agree',
    ])
  })

  it('wraps a long label the same way as the star/point-scale controls', () => {
    const longLabel =
      'This is a very long rating label that would otherwise overflow the narrow column width'
    render(
      <RatingScaleLabelsHeader
        {...baseProps}
        question={buildQuestion({ 1: longLabel })}
      />,
    )

    const labelEl = screen.getByText(longLabel)
    expect(labelEl).toHaveClass('break-normal')
    expect(labelEl).not.toHaveClass('line-clamp-2')
  })

  it('renders nothing when no labels are set on any point', () => {
    render(
      <RatingScaleLabelsHeader {...baseProps} question={buildQuestion()} />,
    )

    expect(
      screen.queryByTestId('rating-scale-labels-header'),
    ).not.toBeInTheDocument()
  })
})
