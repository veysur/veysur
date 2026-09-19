import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Survey as SurveyEntity } from 'veysur-common'

import { PageSurveyPrint } from './PageSurveyPrint'
import { useSurveyAuth } from '../hook/useSurveyAuth'
import { useSurveyParticipantSnapshotPublished } from '../hook/useSurveyParticipantSnapshotPublished'
import { useSurveyParticipantResponse } from '../hook/useSurveyParticipantResponse'

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock('../hook/useSurveyAuth', () => ({
  ...jest.requireActual('../hook/useSurveyAuth'),
  useSurveyAuth: jest.fn(),
}))
jest.mock('../hook/useSurveyParticipantSnapshotPublished', () => ({
  useSurveyParticipantSnapshotPublished: jest.fn(),
}))
jest.mock('../hook/useSurveyParticipantResponse', () => ({
  useSurveyParticipantResponse: jest.fn(),
}))

const mockedUseSurveyAuth = jest.mocked(useSurveyAuth)
const mockedUseSnapshot = jest.mocked(useSurveyParticipantSnapshotPublished)
const mockedUseResponse = jest.mocked(useSurveyParticipantResponse)

const buildSurvey = (presentationOverrides: { print?: boolean } = {}) =>
  new SurveyEntity({
    name: 'Test Survey',
    language: { default: 'en', options: ['en'] },
    presentation: { print: true, ...presentationOverrides },
    elements: [
      { _id: 'q1', code: 'Q1', type: 'text', text: { en: 'Your name?' } },
    ],
  } as ConstructorParameters<typeof SurveyEntity>[0])

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/survey/survey-1/token-1/print']}>
      <Routes>
        <Route
          path="/survey/:surveyId/:token/print"
          element={<PageSurveyPrint />}
        />
      </Routes>
    </MemoryRouter>,
  )

describe('PageSurveyPrint', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSurveyAuth.mockReturnValue({
      jwt: 'jwt-token',
      created: undefined,
      expires: undefined,
      reset: undefined,
      error: null,
      isLoading: false,
      isError: false,
    })
  })

  test('shows a not-available message when the survey has print disabled', () => {
    mockedUseSnapshot.mockReturnValue({
      surveyId: 'survey-1',
      survey: buildSurvey({ print: false }),
      settingSurvey: undefined,
      loading: false,
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
    })
    mockedUseResponse.mockReturnValue({
      response: { answers: { Q1: 'Ada' }, completed: true },
      isLoading: false,
      isError: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('print.notAvailable')).toBeInTheDocument()
    expect(screen.getByText('print.backToSurvey')).toBeInTheDocument()
  })

  test('shows a not-available message when the response is not completed', () => {
    mockedUseSnapshot.mockReturnValue({
      surveyId: 'survey-1',
      survey: buildSurvey(),
      settingSurvey: undefined,
      loading: false,
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
    })
    mockedUseResponse.mockReturnValue({
      response: { answers: {}, completed: false },
      isLoading: false,
      isError: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('print.notAvailable')).toBeInTheDocument()
  })

  test('renders the answer summary when print is enabled and the response is completed', () => {
    mockedUseSnapshot.mockReturnValue({
      surveyId: 'survey-1',
      survey: buildSurvey(),
      settingSurvey: undefined,
      loading: false,
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
    })
    mockedUseResponse.mockReturnValue({
      response: { answers: { Q1: 'Ada Lovelace' }, completed: true },
      isLoading: false,
      isError: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('Your name?')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'print.button' }),
    ).toBeInTheDocument()
  })
})
