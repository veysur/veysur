import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  KEY_STATE_SURVEY_RESPONSE_GET,
  KEY_STATE_SURVEY_RESPONSE_LIST,
  KEY_STATE_SURVEY_STATS,
} from 'appAdmin/common'

import { useSurveyResponseUpdate } from './useSurveyResponseUpdate'
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

describe('useSurveyResponseUpdate', () => {
  const surveyId = 'survey-1'
  const snapshotId = 'snapshot-1'
  const responseId = 'response-1'
  const mockUpdate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue({ _id: responseId })
    ;(getSurveyResponseApi as jest.Mock).mockReturnValue({ update: mockUpdate })
  })

  it('invalidates the response list, response get, and survey stats queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () => useSurveyResponseUpdate(surveyId, snapshotId),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.surveyResponseUpdate({ responseId, response: {} })

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(surveyId, responseId, {})
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
      queryKey: [KEY_STATE_SURVEY_RESPONSE_GET, surveyId, responseId],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_STATS, surveyId],
    })
  })
})
