import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useImportProjectSettings } from './useImportProjectSettings'
import { getImportExportApi } from '../registry'

const authRefresh = jest.fn()

jest.mock('hook/useAuth', () => ({
  useAuth: () => ({
    authRefresh,
    authRefreshWithRetry: jest.fn().mockResolvedValue(undefined),
  }),
}))

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

describe('useImportProjectSettings', () => {
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

  it('sends the selected parts as the import options', async () => {
    mockProcessImport.mockResolvedValue({
      success: true,
      entityId: 'project-1',
      details: [{ part: 'settings', status: 'applied' }],
    })
    const { result } = renderHook(() => useImportProjectSettings(), {
      wrapper: wrapper(),
    })

    await result.current.importProjectSettings({
      file: new File(['a'], 'a.vsps'),
      apply: ['settings', 'templates'],
    })

    await waitFor(() =>
      expect(mockProcessImport).toHaveBeenCalledWith('file-1'),
    )
    expect(mockGenerateImportUrl).toHaveBeenCalledWith('project', {
      format: 'vsps',
      options: { apply: ['settings', 'templates'] },
      fileHash: expect.any(String),
    })
  })

  it('refreshes auth when the timezone was applied', async () => {
    mockProcessImport.mockResolvedValue({
      success: true,
      entityId: 'project-1',
      details: [{ part: 'timezone', status: 'applied' }],
    })
    const { result } = renderHook(() => useImportProjectSettings(), {
      wrapper: wrapper(),
    })

    await result.current.importProjectSettings({
      file: new File(['a'], 'a.vsps'),
      apply: ['timezone'],
    })

    expect(authRefresh).toHaveBeenCalledWith(true)
  })

  it('does not refresh auth when the timezone failed or was not imported', async () => {
    mockProcessImport.mockResolvedValue({
      success: true,
      entityId: 'project-1',
      details: [
        { part: 'timezone', status: 'failed', message: 'nope' },
        { part: 'settings', status: 'applied' },
      ],
    })
    const { result } = renderHook(() => useImportProjectSettings(), {
      wrapper: wrapper(),
    })

    await result.current.importProjectSettings({
      file: new File(['a'], 'a.vsps'),
      apply: ['timezone', 'settings'],
    })

    expect(authRefresh).not.toHaveBeenCalled()
  })
})
