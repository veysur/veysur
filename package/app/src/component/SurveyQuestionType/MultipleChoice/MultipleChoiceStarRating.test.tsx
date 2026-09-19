import { render, screen } from '@testing-library/react'
import { SurveyQuestion } from 'veysur-common'

import { MultipleChoiceStarRating } from './MultipleChoiceStarRating'

function buildQuestion(labels: Record<number, string> = {}): SurveyQuestion {
  const answerOptions = Array.from({ length: 5 }, (_, index) => ({
    _id: `a${index + 1}`,
    code: `P${index + 1}`,
    label: { getLang: () => labels[index + 1] ?? '' },
  }))
  return { _id: 'q1', code: 'Q1', answerOptions } as unknown as SurveyQuestion
}

describe('MultipleChoiceStarRating', () => {
  it('wraps a long label instead of overflowing into the star column', () => {
    const longLabel =
      'This is a very long rating label that would otherwise overflow the narrow star column width'
    render(
      <MultipleChoiceStarRating
        question={buildQuestion({ 1: longLabel })}
        lang="en"
        langDefault="en"
      />,
    )

    const labelEl = screen.getByText(longLabel)
    expect(labelEl).toHaveClass('break-normal')
    expect(labelEl).not.toHaveClass('line-clamp-2')
  })

  it('renders unlabelled points with their numeric aria-label alongside labelled ones', () => {
    render(
      <MultipleChoiceStarRating
        question={buildQuestion({
          1: 'Terrible',
          5: 'Excellent',
        })}
        lang="en"
        langDefault="en"
      />,
    )

    expect(screen.getByRole('radio', { name: 'Terrible' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Excellent' })).toBeInTheDocument()
    // Unlabelled middle stars still render with their plain aria-label
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeInTheDocument()
  })
})
