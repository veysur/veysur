import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  KEY_STATE_SURVEY_RESPONSE_LIST,
  KEY_STATE_SURVEY_STATS,
} from 'appAdmin/common'

import { useSurveyResponseCreate } from './useSurveyResponseCreate'
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

describe('useSurveyResponseCreate', () => {
  const surveyId = 'survey-1'
  const snapshotId = 'snapshot-1'
  const mockCreate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({
      _id: 'response-1',
      publicationId: 'publication-1',
    })
    ;(getSurveyResponseApi as jest.Mock).mockReturnValue({ create: mockCreate })
  })

  it('invalidates the response list and survey stats queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useSurveyResponseCreate(surveyId, snapshotId, 'publication-1'),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.surveyResponseCreate({})

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        surveyId,
        snapshotId,
        {},
        'publication-1',
      )
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [
        KEY_STATE_SURVEY_RESPONSE_LIST,
        surveyId,
        snapshotId,
        'publication-1',
      ],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_STATS, surveyId],
    })
  })
})
