import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  KEY_STATE_PUBLICATION_LIST,
  KEY_STATE_SURVEY_RESPONSE_LIST,
} from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'

import { usePublicationMerge } from './usePublicationMerge'

jest.mock('appAdmin/component/Survey', () => ({
  getPublicationApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePublicationMerge', () => {
  const surveyId = 'survey-1'
  const targetPublicationId = 'publication-target'
  const sourcePublicationId = 'publication-source'
  const mockMergeResponses = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockMergeResponses.mockResolvedValue(undefined)
    ;(getPublicationApi as jest.Mock).mockReturnValue({
      mergeResponses: mockMergeResponses,
    })
  })

  it('invalidates the publication list and survey response list queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () =>
        usePublicationMerge(surveyId, targetPublicationId, sourcePublicationId),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.publicationMerge({})

    await waitFor(() => {
      expect(mockMergeResponses).toHaveBeenCalledWith(
        surveyId,
        targetPublicationId,
        sourcePublicationId,
        {},
      )
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_PUBLICATION_LIST, surveyId],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_RESPONSE_LIST, surveyId],
    })
  })

  it('does not invalidate any queries on a dry run', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () =>
        usePublicationMerge(surveyId, targetPublicationId, sourcePublicationId),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.publicationMerge({ dryRun: true })

    await waitFor(() => {
      expect(mockMergeResponses).toHaveBeenCalledWith(
        surveyId,
        targetPublicationId,
        sourcePublicationId,
        { dryRun: true },
      )
    })

    expect(invalidateQueriesSpy).not.toHaveBeenCalled()
  })
})
