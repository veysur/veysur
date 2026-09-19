import { render, screen } from '@testing-library/react'
import { SurveyQuestion } from 'veysur-common'

import { MultipleChoicePointScale } from './MultipleChoicePointScale'

function buildQuestion(labels: Record<number, string> = {}): SurveyQuestion {
  const answerOptions = Array.from({ length: 5 }, (_, index) => ({
    _id: `a${index + 1}`,
    code: `P${index + 1}`,
    label: { getLang: () => labels[index + 1] ?? '' },
  }))
  return { _id: 'q1', code: 'Q1', answerOptions } as unknown as SurveyQuestion
}

describe('MultipleChoicePointScale', () => {
  it('renders the point numbers with no captions when no labels are set', () => {
    render(
      <MultipleChoicePointScale
        question={buildQuestion()}
        pointCount={5}
        lang="en"
        langDefault="en"
      />,
    )

    expect(screen.getByRole('radio', { name: '1 point' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5 points' })).toBeInTheDocument()
  })

  it('renders an optional caption above a labelled point while keeping the number', () => {
    render(
      <MultipleChoicePointScale
        question={buildQuestion({
          1: 'Strongly disagree',
          5: 'Strongly agree',
        })}
        pointCount={5}
        lang="en"
        langDefault="en"
      />,
    )

    expect(screen.getByText('Strongly disagree')).toBeInTheDocument()
    expect(screen.getByText('Strongly agree')).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: 'Strongly disagree' }),
    ).toBeInTheDocument()
    // Unlabelled middle points still render with their plain aria-label
    expect(screen.getByRole('radio', { name: '3 points' })).toBeInTheDocument()
  })
})
