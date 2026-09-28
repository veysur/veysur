import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useSurveyTemplateList } from './useSurveyTemplateList'
import { getSurveyApi } from '../registry'

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('hook/useAuthdQuery', () => ({
  useAuthdQuery: jest.requireActual('@tanstack/react-query').useQuery,
}))

jest.mock('../registry', () => ({
  getSurveyApi: jest.fn(),
}))

describe('useSurveyTemplateList', () => {
  it('returns the templates from the API', async () => {
    const templates = [
      {
        id: 'nps',
        name: 'Net Promoter Score',
        description: 'Ask the standard question.',
        questionCount: 3,
      },
    ]
    ;(getSurveyApi as jest.Mock).mockReturnValue({
      getTemplates: jest.fn().mockResolvedValue(templates),
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(() => useSurveyTemplateList(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current.templates).toEqual(templates))
  })
})
