import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { MatrixAnswerSummary } from './MatrixAnswerSummary'

const l10n = (value: string) => ({ getLang: () => value })

const buildQuestion = (subquestionType: string) => ({
  answerOptions: [{ _id: 'ao1', code: 'A001', label: l10n('Applies') }],
  subquestions: [
    { _id: 's1', code: 'S001', type: subquestionType, text: l10n('Row one') },
    { _id: 's2', code: 'S002', type: subquestionType, text: l10n('Row two') },
    { _id: 's3', code: 'S003', type: subquestionType, text: l10n('Row three') },
  ],
})

describe('MatrixAnswerSummary', () => {
  test('shows an explicit "No" for a yes/no matrix cell, distinct from an unanswered cell', () => {
    render(
      <MatrixAnswerSummary
        question={buildQuestion('yesNo')}
        answerValue={{ S001: { A001: true }, S002: { A001: false } }}
        lang="en"
        isPrint
      />,
    )

    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    // S003 was never answered - still the "—" placeholder, not "No"
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  test('renders a checkbox matrix cell as a tick, unticked/absent as the placeholder', () => {
    render(
      <MatrixAnswerSummary
        question={buildQuestion('checkbox')}
        answerValue={{ S001: { A001: true }, S002: { A001: false } }}
        lang="en"
        isPrint
      />,
    )

    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  test('renders a typed matrix cell as its raw value', () => {
    render(
      <MatrixAnswerSummary
        question={buildQuestion('number')}
        answerValue={{ S001: { A001: 42 }, S002: { A001: 0 } }}
        lang="en"
        isPrint
      />,
    )

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
