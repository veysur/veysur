import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Survey as SurveyEntity } from 'veysur-common'

import { SurveyAnswersSummary } from './SurveyAnswersSummary'

const buildSurvey = () =>
  new SurveyEntity({
    language: { default: 'en', options: ['en'] },
    elements: [
      {
        _id: 'q1',
        code: 'Q1',
        type: 'text',
        text: { en: 'What is your name?' },
      },
      {
        _id: 'q2',
        code: 'Q2',
        type: 'checkbox',
        text: { en: 'Pick some colours' },
        answerOptions: [
          { _id: 'ao1', code: 'RED', label: { en: 'Red' } },
          { _id: 'ao2', code: 'BLUE', label: { en: 'Blue' } },
        ],
      },
    ],
  } as ConstructorParameters<typeof SurveyEntity>[0])

describe('SurveyAnswersSummary', () => {
  test('renders each question with its formatted answer', () => {
    const survey = buildSurvey()

    render(
      <SurveyAnswersSummary
        survey={survey}
        answers={{ Q1: 'Ada Lovelace', Q2: { RED: true } }}
        lang="en"
      />,
    )

    expect(screen.getByText('What is your name?')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Pick some colours')).toBeInTheDocument()
    expect(screen.getByText('Red')).toBeInTheDocument()
  })

  test('renders a placeholder for unanswered questions', () => {
    const survey = buildSurvey()

    render(<SurveyAnswersSummary survey={survey} answers={{}} lang="en" />)

    expect(screen.getAllByText('—')).toHaveLength(2)
  })
})
