import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useResolveImportResult } from './useResolveImportResult'

const showFlashMessage = jest.fn()

jest.mock('component/FlashMessage', () => ({
  useFlashMessage: () => ({ showFlashMessage }),
}))

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useResolveImportResult', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const wrapper = () =>
    createWrapper(new QueryClient({ defaultOptions: { queries: { retry: false } } }))

  it('returns a synchronous result unchanged', async () => {
    const { result } = renderHook(() => useResolveImportResult(), {
      wrapper: wrapper(),
    })

    const syncResult = { success: true, entityId: 'survey-1', entityType: 'survey' }
    const resolved = await result.current(syncResult)

    expect(resolved).toBe(syncResult)
    expect(showFlashMessage).not.toHaveBeenCalled()
  })

  it('shows the freshly-queued message for a new async job', async () => {
    const { result } = renderHook(() => useResolveImportResult(), {
      wrapper: wrapper(),
    })

    const resolved = await result.current({
      async: true,
      jobId: 'job-1',
      status: 'pending',
    })

    expect(resolved).toBeUndefined()
    expect(showFlashMessage).toHaveBeenCalledWith(
      'info',
      'File queued for import - check notifications for the result.',
    )
  })

  it('shows the already-queued message when the job pre-existed', async () => {
    const { result } = renderHook(() => useResolveImportResult(), {
      wrapper: wrapper(),
    })

    const resolved = await result.current({
      async: true,
      jobId: 'job-1',
      status: 'processing',
      alreadyQueued: true,
    })

    expect(resolved).toBeUndefined()
    expect(showFlashMessage).toHaveBeenCalledWith(
      'info',
      'This file is already queued for import - check notifications for the result.',
    )
  })
})
