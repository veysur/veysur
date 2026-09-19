import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { PageSurvey } from './PageSurvey'
import { useSurveyAuth, ERROR_REG_REQUIRED } from '../hook/useSurveyAuth'
import { useSurveyParticipantSnapshotPublished } from '../hook/useSurveyParticipantSnapshotPublished'
import { useSurveyParticipantMe } from '../hook/useSurveyParticipantMe'
import { useSurveyResponsePersistence } from '../hook/useSurveyResponsePersistence'

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

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/survey/:surveyId" element={<PageSurvey />} />
      </Routes>
    </MemoryRouter>,
  )

describe('PageSurvey registration redirect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedSnapshot.mockReturnValue({
      surveyId: 's1',
      survey: undefined,
      settingSurvey: undefined,
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
