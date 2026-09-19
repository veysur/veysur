import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  KEY_STATE_SURVEY_RESPONSE_LIST,
  KEY_STATE_SURVEY_STATS,
} from 'appAdmin/common'

import { useSurveyResponseDeleteMany } from './useSurveyResponseDeleteMany'
import { getSurveyResponseApi } from '../registry'

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('../registry', () => ({
  getSurveyResponseApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSurveyResponseDeleteMany', () => {
  const surveyId = 'survey-1'
  const snapshotId = 'snapshot-1'
  const mockDelete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockDelete.mockResolvedValue(undefined)
    ;(getSurveyResponseApi as jest.Mock).mockReturnValue({ delete: mockDelete })
  })

  it('invalidates the response list and survey stats queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useSurveyResponseDeleteMany(surveyId, snapshotId),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.surveyResponseDeleteMany(['response-1', 'response-2'])

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(surveyId, [
        'response-1',
        'response-2',
      ])
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [
        KEY_STATE_SURVEY_RESPONSE_LIST,
        surveyId,
        snapshotId,
        undefined,
      ],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_STATS, surveyId],
    })
  })
})
