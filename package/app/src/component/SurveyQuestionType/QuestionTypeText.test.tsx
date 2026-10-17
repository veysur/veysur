import { render, screen } from '@testing-library/react'
import { SurveyQuestion } from 'veysur-common'

import { QuestionTypeText } from './QuestionTypeText'

function buildQuestion(attributes: Record<string, unknown>): SurveyQuestion {
  return {
    _id: 'q1',
    code: 'Q1',
    type: 'text',
    attributes,
  } as unknown as SurveyQuestion
}

const base = { lang: 'en', langDefault: 'en' }

describe('QuestionTypeText', () => {
  it.each([
    ['email', 'email', 'email'],
    ['phone', 'tel', 'tel'],
    ['url', 'url', 'url'],
  ])('renders %s format as a %s input', (textFormat, type, inputMode) => {
    render(
      <QuestionTypeText {...base} question={buildQuestion({ textFormat })} />,
    )
    const input = screen.getByPlaceholderText('Type your answer here')
    expect(input).toHaveAttribute('type', type)
    expect(input).toHaveAttribute('inputmode', inputMode)
  })

  it('keeps a single-line input for a format even when the size is large', () => {
    render(
      <QuestionTypeText
        {...base}
        question={buildQuestion({ textFormat: 'email', inputSize: 'large' })}
      />,
    )
    expect(screen.getByRole('textbox').tagName).toBe('INPUT')
  })

  it('leaves the default text input untouched for none and custom', () => {
    const { rerender } = render(
      <QuestionTypeText
        {...base}
        question={buildQuestion({ textFormat: 'none' })}
      />,
    )
    expect(screen.getByRole('textbox')).not.toHaveAttribute('inputmode')
    rerender(
      <QuestionTypeText
        {...base}
        question={buildQuestion({ textFormat: 'custom' })}
      />,
    )
    expect(screen.getByRole('textbox')).not.toHaveAttribute('inputmode')
  })

  it('still uses a textarea for a medium size without a format', () => {
    render(
      <QuestionTypeText
        {...base}
        question={buildQuestion({ inputSize: 'medium' })}
      />,
    )
    expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA')
  })
})
