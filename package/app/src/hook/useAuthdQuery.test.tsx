import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useAuthdQuery } from './useAuthdQuery'
import * as useAuthHook from './useAuth'

jest.mock('./useAuth', () => ({
  ...jest.requireActual('./useAuth'),
  useAuth: jest.fn(),
}))

const mockUseAuth = (
  overrides: Partial<ReturnType<typeof useAuthHook.useAuth>>,
) => {
  ;(useAuthHook.useAuth as jest.Mock).mockReturnValue({
    auth: null,
    isAuthed: false,
    authRefreshWithRetry: jest.fn(),
    ...overrides,
  })
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAuthdQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('awaits authRefreshWithRetry before queryFn runs', async () => {
    const callOrder: string[] = []
    const authRefreshWithRetry = jest.fn().mockImplementation(async () => {
      callOrder.push('authRefresh')
    })
    mockUseAuth({ authRefreshWithRetry })

    const { result } = renderHook(
      () =>
        useAuthdQuery({
          queryKey: ['thing'],
          queryFn: async () => {
            callOrder.push('queryFn')
            return 'ok'
          },
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(callOrder).toEqual(['authRefresh', 'queryFn'])
    expect(result.current.data).toBe('ok')
  })

  it('propagates a queryFn error', async () => {
    mockUseAuth({ authRefreshWithRetry: jest.fn() })

    const { result } = renderHook(
      () =>
        useAuthdQuery({
          queryKey: ['thing-error'],
          queryFn: async () => {
            throw new Error('boom')
          },
        }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('boom')
  })
})
