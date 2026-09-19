import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useInvalidatingMutation } from './useInvalidatingMutation'
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

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useInvalidatingMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth({})
  })

  it('awaits authRefreshWithRetry before mutationFn runs', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const callOrder: string[] = []
    const authRefreshWithRetry = jest.fn().mockImplementation(async () => {
      callOrder.push('authRefresh')
    })
    mockUseAuth({ authRefreshWithRetry })

    const { result } = renderHook(
      () =>
        useInvalidatingMutation({
          mutationFn: async () => {
            callOrder.push('mutationFn')
            return 'ok'
          },
          invalidateKeys: [],
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.mutateAsync(undefined)

    expect(callOrder).toEqual(['authRefresh', 'mutationFn'])
  })

  it('invalidates every key in a static key array', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () =>
        useInvalidatingMutation({
          mutationFn: async () => 'ok',
          invalidateKeys: [['keyA'], ['keyB', 'id-1']],
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.mutateAsync(undefined)

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['keyA'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['keyB', 'id-1'],
    })
  })

  it('derives keys from data and variables when given a function', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(
      () =>
        useInvalidatingMutation({
          mutationFn: async (variables: { id: string }) => ({
            savedId: variables.id,
          }),
          invalidateKeys: (data, variables) => [
            ['detail', data.savedId],
            ['list', variables.id],
          ],
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.mutateAsync({ id: 'p1' })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['detail', 'p1'],
    })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['list', 'p1'],
    })
  })

  it('does not resolve mutateAsync until invalidation has completed', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let resolveInvalidate: () => void = () => {}
    const invalidatePromise = new Promise<void>((resolve) => {
      resolveInvalidate = resolve
    })
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockReturnValue(invalidatePromise)

    const { result } = renderHook(
      () =>
        useInvalidatingMutation({
          mutationFn: async () => 'ok',
          invalidateKeys: [['keyA']],
        }),
      { wrapper: createWrapper(queryClient) },
    )

    let resolved = false
    const mutatePromise = result.current.mutateAsync(undefined).then(() => {
      resolved = true
    })

    // Give pending microtasks a chance to run - resolved must still be false
    // because the invalidation promise we control hasn't settled yet.
    await Promise.resolve()
    await Promise.resolve()
    expect(resolved).toBe(false)

    resolveInvalidate()
    await mutatePromise
    expect(resolved).toBe(true)
  })

  it('runs a caller-supplied onSuccess after invalidation, and awaits it', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const callOrder: string[] = []
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockImplementation(async () => {
        callOrder.push('invalidate')
      })

    const { result } = renderHook(
      () =>
        useInvalidatingMutation({
          mutationFn: async () => 'ok',
          invalidateKeys: [['keyA']],
          onSuccess: async () => {
            callOrder.push('onSuccess')
          },
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await result.current.mutateAsync(undefined)

    await waitFor(() => {
      expect(callOrder).toEqual(['invalidate', 'onSuccess'])
    })
  })
})
