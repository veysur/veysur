import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SortDirection, SortState } from 'component/DataTable'

export interface UseListPageUrlSortOptions {
  /** Sort field used when the `sort` URL param is absent. */
  defaultSortKey: string
  /** Sort direction used when the `sortOrder` URL param is absent. */
  defaultDirection?: SortDirection
}

export interface UseListPageUrlSortReturn {
  sortState: SortState
  handleSortChange: (key: string, direction: SortDirection) => void
}

/**
 * URL-persisted sort state for DataTable's sortable column headers, shared
 * across list pages. Stores the sort field in the `sort` param and direction
 * in `sortOrder`, mirroring how filter values already live in the URL.
 */
export function useListPageUrlSort({
  defaultSortKey,
  defaultDirection = 'desc',
}: UseListPageUrlSortOptions): UseListPageUrlSortReturn {
  const [searchParams, setSearchParams] = useSearchParams()

  const sortKey = searchParams.get('sort') ?? defaultSortKey
  const sortDirection =
    (searchParams.get('sortOrder') as SortDirection) || defaultDirection

  // Memoized so identity is stable across renders when the URL params haven't
  // changed — this feeds into useListPageState's filterDeps, and a fresh
  // object here every render makes the page-reset effect in
  // useListPageUrlFilters fire on every render (its dependency array is
  // compared per-element via Object.is), triggering setPage(1) -> a URL
  // change -> a re-render -> a new sortState -> ad infinitum.
  const sortState: SortState = useMemo(
    () => ({ key: sortKey, direction: sortDirection }),
    [sortKey, sortDirection],
  )

  const handleSortChange = (key: string, direction: SortDirection) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (key === defaultSortKey) {
          next.delete('sort')
        } else {
          next.set('sort', key)
        }
        if (direction === defaultDirection) {
          next.delete('sortOrder')
        } else {
          next.set('sortOrder', direction)
        }
        return next
      },
      { replace: true },
    )
  }

  return { sortState, handleSortChange }
}
