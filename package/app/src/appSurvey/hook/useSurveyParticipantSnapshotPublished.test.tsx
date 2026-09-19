import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useSurveyParticipantSnapshotPublished } from './useSurveyParticipantSnapshotPublished'
import { getSurveyParticipantSnapshotApi } from 'appSurvey/registry'

jest.mock('appSurvey/registry', () => ({
  getSurveyParticipantSnapshotApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function makeJwt(payload: Record<string, unknown>): string {
  const base64Url = (value: string) =>
    btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  return [
    base64Url(JSON.stringify({ alg: 'none' })),
    base64Url(JSON.stringify(payload)),
    'signature',
  ].join('.')
}

describe('useSurveyParticipantSnapshotPublished', () => {
  const surveyId = 'survey-1'
  const mockGetSurveySnapshot = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getSurveyParticipantSnapshotApi as jest.Mock).mockReturnValue({
      getSurveySnapshot: mockGetSurveySnapshot,
    })
    mockGetSurveySnapshot.mockResolvedValue({
      snapshotData: { survey: { _id: surveyId } },
      settingSurveyData: {},
    })
  })

  test('refetches when the JWT resolves to a different snapshotId, even though surveyId and lang are unchanged', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const jwtV1 = makeJwt({ snapshotId: 'snapshot_v1' })
    const jwtV2 = makeJwt({ snapshotId: 'snapshot_v2' })

    const { result, rerender } = renderHook(
      ({ jwt }) => useSurveyParticipantSnapshotPublished(surveyId, jwt, 'en'),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { jwt: jwtV1 },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(mockGetSurveySnapshot).toHaveBeenCalledTimes(1)

    rerender({ jwt: jwtV2 })

    await waitFor(() => {
      expect(mockGetSurveySnapshot).toHaveBeenCalledTimes(2)
    })
    expect(mockGetSurveySnapshot).toHaveBeenLastCalledWith(
      surveyId,
      jwtV2,
      'en',
    )
  })

  test('does not refetch when the JWT changes but decodes to the same snapshotId', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const jwtA = makeJwt({ snapshotId: 'snapshot_v1', iat: 1 })
    const jwtB = makeJwt({ snapshotId: 'snapshot_v1', iat: 2 })

    const { result, rerender } = renderHook(
      ({ jwt }) => useSurveyParticipantSnapshotPublished(surveyId, jwt, 'en'),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { jwt: jwtA },
      },
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(mockGetSurveySnapshot).toHaveBeenCalledTimes(1)

    rerender({ jwt: jwtB })

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false)
    })
    expect(mockGetSurveySnapshot).toHaveBeenCalledTimes(1)
  })
})
