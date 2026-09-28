import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import { useSurveyExportMarkdown } from './useSurveyExportMarkdown'
import { getImportExportApi } from 'appAdmin/component/ImportExport/registry'

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('appAdmin/component/ImportExport/registry', () => ({
  getImportExportApi: jest.fn(),
}))

const mockStartExportDownload = jest.fn()
jest.mock(
  'appAdmin/component/ImportExport/hook/useStartExportDownload',
  () => ({
    useStartExportDownload: () => mockStartExportDownload,
  }),
)

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSurveyExportMarkdown', () => {
  const mockExportEntity = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockExportEntity.mockResolvedValue({
      downloadUrl: 'https://example.com/survey.md',
    })
    ;(getImportExportApi as jest.Mock).mockReturnValue({
      exportEntity: mockExportEntity,
    })
  })

  const wrapper = () =>
    createWrapper(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    )

  it('requests the markdown format and starts the download', async () => {
    const { result } = renderHook(() => useSurveyExportMarkdown(), {
      wrapper: wrapper(),
    })

    await result.current.exportSurveyMarkdown('survey-1')

    await waitFor(() => {
      expect(mockExportEntity).toHaveBeenCalledWith(
        'survey',
        'survey-1',
        'markdown',
      )
    })

    expect(mockStartExportDownload).toHaveBeenCalledWith({
      downloadUrl: 'https://example.com/survey.md',
    })
  })
})
