import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import {
  KEY_STATE_PUBLICATION_ACTIVE,
  KEY_STATE_PUBLICATION_LIST,
} from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'

import { usePublicationDelete } from './usePublicationDelete'

jest.mock('appAdmin/component/Survey', () => ({
  getPublicationApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('usePublicationDelete', () => {
  const surveyId = 'survey-1'
  const mockDeleteMany = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockDeleteMany.mockResolvedValue(undefined)
    ;(getPublicationApi as jest.Mock).mockReturnValue({
      deleteMany: mockDeleteMany,
    })
  })

  it('invalidates both the publication list and active publication queries on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => usePublicationDelete(surveyId), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.publicationDelete('publication-1')

    await waitFor(() => {
      expect(mockDeleteMany).toHaveBeenCalledWith(surveyId, ['publication-1'])
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_PUBLICATION_LIST, surveyId],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_PUBLICATION_ACTIVE, surveyId],
    })
  })
})
