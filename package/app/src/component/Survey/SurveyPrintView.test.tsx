import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Survey as SurveyEntity } from 'veysur-common'

import { SurveyPrintView } from './SurveyPrintView'

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({ t: (key: string) => key }),
}))

const buildSurvey = () =>
  new SurveyEntity({
    name: 'Test Survey',
    language: { default: 'en', options: ['en'] },
    elements: [
      { _id: 'q1', code: 'Q1', type: 'text', text: { en: 'Your name?' } },
    ],
  } as ConstructorParameters<typeof SurveyEntity>[0])

describe('SurveyPrintView', () => {
  test('renders the answer summary and a print button', () => {
    render(
      <SurveyPrintView
        survey={buildSurvey()}
        answers={{ Q1: 'Ada Lovelace' }}
        lang="en"
      />,
    )

    expect(screen.getByText('Your name?')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'print.button' }),
    ).toBeInTheDocument()
  })
})
