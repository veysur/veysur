import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { Survey } from 'veysur-common'

import { PageSurvey } from './PageSurvey'
import { useSurveyAuth, ERROR_REG_REQUIRED } from '../hook/useSurveyAuth'
import { useSurveyParticipantSnapshotPublished } from '../hook/useSurveyParticipantSnapshotPublished'
import { useSurveyParticipantMe } from '../hook/useSurveyParticipantMe'
import {
  useSurveyResponsePersistence,
  ERROR_SURVEY_COMPLETED,
} from '../hook/useSurveyResponsePersistence'
import { ErrorRest } from 'model'

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

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
jest.mock('../hook/useSurveyParticipantMe', () => ({
  useSurveyParticipantMe: jest.fn(),
}))
jest.mock('../hook/useSurveyResponsePersistence', () => ({
  ...jest.requireActual('../hook/useSurveyResponsePersistence'),
  useSurveyResponsePersistence: jest.fn(),
}))

const mockedAuth = jest.mocked(useSurveyAuth)
const mockedSnapshot = jest.mocked(useSurveyParticipantSnapshotPublished)
const mockedMe = jest.mocked(useSurveyParticipantMe)
const mockedResponse = jest.mocked(useSurveyResponsePersistence)

const queryClient = new QueryClient()

const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/survey/:surveyId" element={<PageSurvey />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe('PageSurvey registration redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSnapshot.mockReturnValue({
      surveyId: 's1',
      survey: undefined,
      settingSurvey: undefined,
      settingProject: undefined,
      loading: false,
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
    })
    mockedMe.mockReturnValue({ participantData: {} } as never)
    mockedResponse.mockReturnValue({
      saveResponse: jest.fn(),
      response: undefined,
      loadedResponse: undefined,
      loadError: null,
      isLoading: false,
    } as never)
  })

  test('carries the ?lang= param over to the registration page', () => {
    mockedAuth.mockReturnValue({
      jwt: undefined,
      created: undefined,
      expires: undefined,
      reset: undefined,
      botProtection: undefined,
      botVerified: true,
      verifyBot: jest.fn(),
      fetchBotChallenge: jest.fn(),
      error: { ref: ERROR_REG_REQUIRED } as never,
      isLoading: false,
      isError: true,
    })

    renderAt('/survey/s1?lang=de')

    expect(mockNavigate).toHaveBeenCalledWith('/s1/register?lang=de', {
      replace: true,
    })
  })

  test('redirects without a query string when none is present', () => {
    mockedAuth.mockReturnValue({
      jwt: undefined,
      created: undefined,
      expires: undefined,
      reset: undefined,
      botProtection: undefined,
      botVerified: true,
      verifyBot: jest.fn(),
      fetchBotChallenge: jest.fn(),
      error: { ref: ERROR_REG_REQUIRED } as never,
      isLoading: false,
      isError: true,
    })

    renderAt('/survey/s1')

    expect(mockNavigate).toHaveBeenCalledWith('/s1/register', {
      replace: true,
    })
  })
})

describe('PageSurvey repeat-submission flag', () => {
  const setSurvey = (preventRepeat: boolean) =>
    mockedSnapshot.mockReturnValue({
      surveyId: 's1',
      survey: new Survey({
        _id: 's1',
        name: 'S',
        access: { preventRepeat },
      } as never) as never,
      settingSurvey: undefined,
      settingProject: undefined,
      loading: false,
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockReturnValue({
      jwt: 'jwt',
      error: undefined,
      isLoading: false,
      isError: false,
    } as never)
    mockedMe.mockReturnValue({ participantData: {} } as never)
    mockedResponse.mockReturnValue({
      saveResponse: jest.fn(),
      response: undefined,
      loadedResponse: undefined,
      loadError: null,
      isLoading: false,
    } as never)
    window.localStorage.setItem('veysur_done_s1', '1')
  })

  afterEach(() => {
    window.localStorage.removeItem('veysur_done_s1')
  })

  test('shows the already-completed card when the stored flag and setting are set', () => {
    setSurvey(true)
    const { getByText } = renderAt('/survey/s1')
    expect(getByText('page.surveyCompletedTitle')).toBeInTheDocument()
  })

  test('does not block when the setting is off', () => {
    setSurvey(false)
    const { queryByText } = renderAt('/survey/s1')
    expect(queryByText('page.surveyCompletedTitle')).not.toBeInTheDocument()
  })
})

describe('PageSurvey completed session restart', () => {
  const setSurvey = (preventRepeat: boolean) =>
    mockedSnapshot.mockReturnValue({
      surveyId: 's1',
      survey: new Survey({
        _id: 's1',
        name: 'S',
        access: { preventRepeat },
      } as never) as never,
      settingSurvey: undefined,
      settingProject: undefined,
      loading: false,
      error: null,
      isLoading: false,
      isFetching: false,
      isError: false,
    })

  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockReturnValue({
      jwt: 'jwt',
      error: undefined,
      isLoading: false,
      isError: false,
    } as never)
    mockedMe.mockReturnValue({ participantData: {} } as never)
    mockedResponse.mockReturnValue({
      saveResponse: jest.fn(),
      response: undefined,
      loadedResponse: undefined,
      loadError: new ErrorRest({ ref: ERROR_SURVEY_COMPLETED }),
      isLoading: false,
    } as never)
  })

  test('resets the cached auth and response when repeats are allowed', () => {
    setSurvey(false)
    const reset = jest.spyOn(queryClient, 'resetQueries')
    renderAt('/survey/s1')
    expect(reset).toHaveBeenCalledTimes(2)
  })

  test('keeps the completed card when repeats are prevented', () => {
    setSurvey(true)
    const reset = jest.spyOn(queryClient, 'resetQueries')
    const { getByText } = renderAt('/survey/s1')
    expect(reset).not.toHaveBeenCalled()
    expect(getByText('page.surveyCompletedTitle')).toBeInTheDocument()
  })
})
