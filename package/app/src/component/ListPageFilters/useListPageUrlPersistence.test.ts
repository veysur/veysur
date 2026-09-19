import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import { useListPageUrlPersistence } from './useListPageUrlPersistence'
import { useListPageState } from './useListPageState'

const createWrapper = (queryClient: QueryClient, initialEntries: string[]) => {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, { initialEntries }, children),
    )
  }
}

const renderListPageUrlPersistence = (
  queryClient: QueryClient,
  initialEntries: string[],
  storageKey = 'test-list',
) => {
  return renderHook(
    () => {
      const [searchParams] = useSearchParams()
      useListPageUrlPersistence({ storageKey })
      return { searchParams }
    },
    { wrapper: createWrapper(queryClient, initialEntries) },
  )
}

describe('useListPageUrlPersistence', () => {
  beforeEach(() => {
    window.scrollTo = jest.fn()
  })

  it('restores persisted filters when the URL has no query string', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(
      ['listPageFilters', 'test-list'],
      'status=paid&sort=created',
    )

    const { result } = renderListPageUrlPersistence(queryClient, ['/'])

    await waitFor(() => {
      expect(result.current.searchParams.get('status')).toBe('paid')
    })
    expect(result.current.searchParams.get('sort')).toBe('created')
  })

  it('does not restore when the URL already has query params', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(['listPageFilters', 'test-list'], 'status=paid')

    const { result } = renderListPageUrlPersistence(queryClient, [
      '/?status=void',
    ])

    await waitFor(() => {
      expect(
        queryClient.getQueryState(['listPageFilters', 'test-list'])?.status,
      ).toBe('success')
    })
    expect(result.current.searchParams.get('status')).toBe('void')
  })

  it('persists filter changes, stripping page and per-page', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    renderListPageUrlPersistence(queryClient, [
      '/?status=paid&page=2&per-page=50',
    ])

    await waitFor(() => {
      expect(queryClient.getQueryData(['listPageFilters', 'test-list'])).toBe(
        'status=paid',
      )
    })
  })

  it('survives a fresh mount alongside usePagination default-fill (regression: nav-away-and-back wiped filters)', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const renderPage = (initialEntries: string[]) =>
      renderHook(
        () => {
          const [searchParams] = useSearchParams()
          const state = useListPageState({
            storageKey: 'test-list',
            defaultSortKey: 'created',
            filterDeps: [searchParams.get('role') ?? ''],
            hasFilters: !!searchParams.get('role'),
          })
          return { searchParams, ...state }
        },
        { wrapper: createWrapper(queryClient, initialEntries) },
      )

    // First visit: land with a role filter already applied via the URL, as
    // if the user had just set it through the filter toolbar.
    const first = renderPage(['/?role=admin'])
    await waitFor(() => {
      expect(queryClient.getQueryData(['listPageFilters', 'test-list'])).toBe(
        'role=admin',
      )
    })
    first.unmount()

    // Second visit: fresh mount with no query string, simulating navigating
    // away to another list page and back via a plain nav link. usePagination
    // fires its own default page/per-page fill on this same mount — the
    // restored role filter must survive that, not get silently dropped.
    const second = renderPage(['/'])
    await waitFor(() => {
      expect(second.result.current.searchParams.get('role')).toBe('admin')
    })
  })
})
