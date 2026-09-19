import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

type SetSearchParams = ReturnType<typeof useSearchParams>[1]

export interface UseListPageUrlFiltersOptions {
  /** Current values of every filter driving this list — reset to page 1 when any of them change. */
  filterDeps: unknown[]
  setPage: (page: number) => void
  setSearchParams: SetSearchParams
  /** Whether any filter is currently active. Callers compute this themselves since the field set varies per page. */
  hasFilters: boolean
}

export interface UseListPageUrlFiltersReturn {
  hasFilters: boolean
  /** Clears every URL filter param. The page-reset effect handles returning to page 1. */
  clearFilters: () => void
}

/**
 * Owns the page-reset-on-filter-change effect and clear-filters action shared
 * by the platform/account billing list pages (invoices, credit notes,
 * payments). Filter field definitions and their rendering stay page-local
 * since they genuinely differ (free-text ID inputs vs FilterToolbar selects).
 */
export function useListPageUrlFilters({
  filterDeps,
  setPage,
  setSearchParams,
  hasFilters,
}: UseListPageUrlFiltersOptions): UseListPageUrlFiltersReturn {
  const isFirstRun = useRef(true)

  useEffect(() => {
    // Skip the initial mount: this effect resets the page on filter *changes*,
    // not on landing on the page. Firing on mount too would reset a bookmarked
    // `?role=admin&page=3` URL back to page 1, and races with other mount-time
    // setSearchParams callers (usePagination's default-fill, list-page filter
    // restoration) — react-router's setSearchParams doesn't compose across
    // independent calls in the same render's effect flush, so whichever call
    // lands last wins and silently wipes the others' params.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterDeps is caller-supplied and already includes every filter value; setPage is stable
  }, filterDeps)

  const clearFilters = () => {
    setSearchParams({})
  }

  return { hasFilters, clearFilters }
}
