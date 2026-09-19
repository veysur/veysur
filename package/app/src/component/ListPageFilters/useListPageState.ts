import { useSearchParams } from 'react-router-dom'

import { usePagination, UsePaginationReturn } from 'hook'
import {
  useDateRangeUrlFilter,
  UseDateRangeUrlFilterParams,
  DateRangeFilter,
} from 'component/DateRangeFilter'
import { SortDirection, SortState } from 'component/DataTable'

import { useListPageUrlSort } from './useListPageUrlSort'
import { useListPageUrlFilters } from './useListPageUrlFilters'
import { useListPageUrlPersistence } from './useListPageUrlPersistence'

export interface UseListPageStateOptions {
  storageKey: string
  defaultPerPage?: number
  defaultSortKey: string
  defaultSortDirection?: SortDirection
  dateRangeParams?: UseDateRangeUrlFilterParams
  /** Non-date-range filter values that should reset the page to 1 when they change. */
  filterDeps: unknown[]
  /** Whether any non-date-range filter is currently active. Date range is folded in automatically. */
  hasFilters: boolean
}

export interface UseListPageStateReturn {
  pagination: UsePaginationReturn
  sortState: SortState
  handleSortChange: (key: string, direction: SortDirection) => void
  dateRangeFilter: DateRangeFilter
  startDate: string
  endDate: string
  applyDateRangeToParams: (
    params: URLSearchParams,
    date: DateRangeFilter,
  ) => void
  hasFilters: boolean
  clearFilters: () => void
}

/**
 * Combines pagination, URL-persisted date range, URL-persisted sort, and
 * page-reset-on-filter-change — the wiring repeated across every platform
 * and account list page. Page-specific filter fields (IDs, status, search)
 * stay local to each page since their shape genuinely differs.
 */
export function useListPageState({
  storageKey,
  defaultPerPage = 20,
  defaultSortKey,
  defaultSortDirection,
  dateRangeParams,
  filterDeps,
  hasFilters,
}: UseListPageStateOptions): UseListPageStateReturn {
  const [, setSearchParams] = useSearchParams()

  useListPageUrlPersistence({ storageKey })

  const pagination = usePagination({ defaultPerPage, storageKey })
  const { setPage } = pagination

  const { dateRangeFilter, startDate, endDate, applyDateRangeToParams } =
    useDateRangeUrlFilter(dateRangeParams)

  const { sortState, handleSortChange } = useListPageUrlSort({
    defaultSortKey,
    defaultDirection: defaultSortDirection,
  })

  const combinedHasFilters = hasFilters || !!startDate || !!endDate

  const { clearFilters } = useListPageUrlFilters({
    filterDeps: [...filterDeps, startDate, endDate, sortState],
    setPage,
    setSearchParams,
    hasFilters: combinedHasFilters,
  })

  return {
    pagination,
    sortState,
    handleSortChange,
    dateRangeFilter,
    startDate,
    endDate,
    applyDateRangeToParams,
    hasFilters: combinedHasFilters,
    clearFilters,
  }
}
