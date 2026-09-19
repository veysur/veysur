import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Patch } from 'veysur-common'

import { usePatchableState } from './usePatchableState'

const createWrapper = (queryClient: QueryClient) => {
  // eslint-disable-next-line react/display-name -- test wrapper, not a rendered component that needs devtools naming
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const patches: Patch[] = [
  { type: 'thing', action: 'update', data: { name: 'new-name' } },
]

describe('usePatchableState', () => {
  it('awaits an async onPersistSuccess before the persist mutation resolves', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    let resolvePersistSuccess: () => void = () => {}
    const persistSuccessPromise = new Promise<void>((resolve) => {
      resolvePersistSuccess = resolve
    })
    const onPersistSuccess = jest.fn(() => persistSuccessPromise)

    const { result } = renderHook(
      () =>
        usePatchableState({
          queryKey: ['thing', 'id-1'],
          fetchFn: async () => ({ name: 'original' }),
          applyPatchesFn: (_patches, data) => data,
          persistPatchesFn: async () => {},
          onPersistSuccess,
        }),
      { wrapper: createWrapper(queryClient) },
    )

    let resolved = false
    const mutatePromise = result.current.patchMutation
      .mutateAsync(patches)
      .then(() => {
        resolved = true
      })

    await waitFor(() => expect(onPersistSuccess).toHaveBeenCalled())

    // The persist mutation must not resolve until the async onPersistSuccess
    // callback we control has settled.
    await Promise.resolve()
    await Promise.resolve()
    expect(resolved).toBe(false)

    resolvePersistSuccess()
    await mutatePromise
    expect(resolved).toBe(true)
  })

  it('updateState reads live cache data rather than a stale closure', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { result } = renderHook(
      () =>
        usePatchableState<{ items: string[] }, Patch>({
          queryKey: ['thing', 'id-1'],
          fetchFn: async () => ({ items: [] }),
          applyPatchesFn: (_patches, data) => data,
          persistPatchesFn: async () => {},
        }),
      { wrapper: createWrapper(queryClient) },
    )

    await waitFor(() => expect(result.current.data).toEqual({ items: [] }))

    // Simulate a write landing between when a caller last observed state and
    // when its own updateState call actually runs — e.g. a debounced patch-
    // buffer flush or a background refetch merge. A caller that captures a
    // stale snapshot instead of reading the live cache would silently
    // clobber this write; updateState must not.
    act(() => {
      queryClient.setQueryData(
        ['thing', 'id-1'],
        (current: { items: string[] }) => ({
          items: [...current.items, 'from-intervening-write'],
        }),
      )
    })

    act(() => {
      result.current.updateState((current) => ({
        items: [...current.items, 'from-updater'],
      }))
    })

    await waitFor(() =>
      expect(queryClient.getQueryData(['thing', 'id-1'])).toEqual({
        items: ['from-intervening-write', 'from-updater'],
      }),
    )
  })
})
