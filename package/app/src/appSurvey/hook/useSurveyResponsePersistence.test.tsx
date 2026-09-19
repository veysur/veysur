import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  useSurveyResponsePersistence,
  ERROR_SURVEY_COMPLETED,
} from './useSurveyResponsePersistence'
import { getSurveyParticipantResponseApi } from 'appSurvey/registry'

jest.mock('appSurvey/registry', () => ({
  getSurveyParticipantResponseApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSurveyResponsePersistence', () => {
  const surveyId = 'survey-1'
  const authToken = 'token-1'
  const mockGetResponse = jest.fn()
  const mockSaveResponse = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSurveyParticipantResponseApi as jest.Mock).mockReturnValue({
      getResponse: mockGetResponse,
      saveResponse: mockSaveResponse,
    })
  })

  test('blocks re-entry when the loaded response is completed=true even with a null completedAt', async () => {
    mockGetResponse.mockResolvedValue({
      response: {
        answers: { q1: 'a' },
        completed: true,
        completedAt: null,
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(
      () =>
        useSurveyResponsePersistence({ surveyId, authToken, enabled: true }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => {
      expect(result.current.loadError).not.toBeNull()
    })

    expect(result.current.loadError?.ref).toBe(ERROR_SURVEY_COMPLETED)
  })

  test('does not block loading an in-progress response (completed=false)', async () => {
    mockGetResponse.mockResolvedValue({
      response: {
        answers: { q1: 'a' },
        completed: false,
        completedAt: null,
      },
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(
      () =>
        useSurveyResponsePersistence({ surveyId, authToken, enabled: true }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.loadError).toBeNull()
    expect(result.current.isCompleted).toBe(false)
  })

  test('optimistically marks completed=true after a completing save, regardless of completedAt', async () => {
    mockGetResponse.mockResolvedValue({
      response: { answers: {}, completed: false, completedAt: null },
    })
    mockSaveResponse.mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(
      () =>
        useSurveyResponsePersistence({ surveyId, authToken, enabled: true }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await result.current.saveResponse({ q1: 'a' }, true)

    await waitFor(() => {
      expect(result.current.isCompleted).toBe(true)
    })
  })
})
