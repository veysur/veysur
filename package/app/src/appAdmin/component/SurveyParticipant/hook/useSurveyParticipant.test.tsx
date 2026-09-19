import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useSurveyParticipant } from './useSurveyParticipant'
import { getSurveyParticipantApi } from '../registry'

let mockProject: { _id: string } | null = { _id: 'project-1' }

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => mockProject,
}))

jest.mock('../registry', () => ({
  getSurveyParticipantApi: jest.fn(),
}))

// Delegate straight to react-query - the JWT-refresh wrapper is not under test here.
jest.mock('hook/useAuthdQuery', () => {
  const { useQuery } = jest.requireActual('@tanstack/react-query')
  return { useAuthdQuery: useQuery }
})

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe('useSurveyParticipant', () => {
  const surveyId = 'survey-1'
  const participantId = 'participant-99'
  const mockGetOne = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockProject = { _id: 'project-1' }
    ;(getSurveyParticipantApi as jest.Mock).mockReturnValue({
      getOne: mockGetOne,
    })
  })

  it('fetches the participant by id and returns a model instance', async () => {
    mockGetOne.mockResolvedValue({
      _id: participantId,
      surveyId,
      nameFirst: 'Ada',
      nameLast: 'Lovelace',
      email: 'ada@example.com',
    })

    const { result } = renderHook(
      () => useSurveyParticipant(surveyId, participantId),
      { wrapper: createWrapper(newQueryClient()) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGetOne).toHaveBeenCalledWith(surveyId, participantId)
    expect(result.current.participant?._id).toBe(participantId)
    expect(result.current.participant?.nameFirst).toBe('Ada')
    expect(result.current.error).toBeNull()
  })

  it('stays loading while the project domain is still resolving', () => {
    mockProject = null

    const { result } = renderHook(
      () => useSurveyParticipant(surveyId, participantId),
      { wrapper: createWrapper(newQueryClient()) },
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.participant).toBeNull()
    expect(mockGetOne).not.toHaveBeenCalled()
  })

  it('surfaces the error message when the fetch fails', async () => {
    mockGetOne.mockRejectedValue(new Error('Survey participant not found'))

    const { result } = renderHook(
      () => useSurveyParticipant(surveyId, participantId),
      { wrapper: createWrapper(newQueryClient()) },
    )

    await waitFor(() =>
      expect(result.current.error).toBe('Survey participant not found'),
    )
    expect(result.current.participant).toBeNull()
  })
})
