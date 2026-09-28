import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { KEY_STATE_SURVEY_LIST } from 'appAdmin/common'

import { useSurveyCreate } from './useSurveyCreate'
import { getSurveyApi } from '../registry'

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('../registry', () => ({
  getSurveyApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSurveyCreate', () => {
  const mockCreate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({ _id: 'survey-1', name: 'New survey' })
    ;(getSurveyApi as jest.Mock).mockReturnValue({ create: mockCreate })
  })

  it('invalidates the survey list query on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSurveyCreate(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.surveyCreate({ name: 'New survey' })

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({ name: 'New survey' }, undefined)
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [KEY_STATE_SURVEY_LIST],
    })
  })
})
