import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useImportSurveyMarkdown } from './useImportSurveyMarkdown'
import { getImportExportApi } from '../registry'

jest.mock('appAdmin/hook', () => ({
  useProjectDomain: () => ({ _id: 'project-1' }),
}))

jest.mock('../registry', () => ({
  getImportExportApi: jest.fn(),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useImportSurveyMarkdown', () => {
  const mockGenerateImportUrl = jest.fn()
  const mockUploadToS3 = jest.fn()
  const mockProcessImport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateImportUrl.mockResolvedValue({
      fileId: 'file-1',
      uploadUrl: 'https://example.com/upload',
    })
    mockUploadToS3.mockResolvedValue(undefined)
    mockProcessImport.mockResolvedValue({ success: true, entityId: 'survey-1' })
    ;(getImportExportApi as jest.Mock).mockReturnValue({
      generateImportUrl: mockGenerateImportUrl,
      uploadToS3: mockUploadToS3,
      processImport: mockProcessImport,
    })
  })

  const wrapper = () =>
    createWrapper(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    )

  it('requests the markdown format, computes and sends the file hash, then uploads and processes normally', async () => {
    const { result } = renderHook(() => useImportSurveyMarkdown(), {
      wrapper: wrapper(),
    })

    await result.current.importSurveyMarkdown({ file: new File(['a'], 'a.md') })

    await waitFor(() => {
      expect(mockProcessImport).toHaveBeenCalledWith('file-1')
    })

    expect(mockGenerateImportUrl).toHaveBeenCalledWith(
      'survey',
      expect.objectContaining({
        format: 'markdown',
        fileHash: expect.any(String),
      }),
    )
  })

  it('skips the upload and process steps when the file is already queued', async () => {
    mockGenerateImportUrl.mockResolvedValue({
      alreadyQueued: true,
      jobId: 'job-1',
      status: 'pending',
    })

    const { result } = renderHook(() => useImportSurveyMarkdown(), {
      wrapper: wrapper(),
    })

    await result.current.importSurveyMarkdown({ file: new File(['a'], 'a.md') })

    await waitFor(() => {
      expect(mockGenerateImportUrl).toHaveBeenCalled()
    })

    expect(mockUploadToS3).not.toHaveBeenCalled()
    expect(mockProcessImport).not.toHaveBeenCalled()
  })
})
