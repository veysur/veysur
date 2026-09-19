import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DateRangeFilter,
  DEFAULT_DATE_RANGE_FILTER,
} from 'component/DateRangeFilter'

export interface UseDateFilterReturn {
  dateRangeFilter: DateRangeFilter
  handleDateRangeChange: (filter: DateRangeFilter) => void
}

/**
 * Hook for managing date range filtering with URL synchronization
 * Simpler than useSurveyPageFilters - only handles date filtering without publication logic
 *
 * @example
 * const dateFilter = useDateFilter()
 * // Use in API call:
 * useSurveyList(search, page, perPage,
 *   dateFilter.dateRangeFilter.startDate,
 *   dateFilter.dateRangeFilter.endDate,
 *   dateFilter.dateRangeFilter.dateField
 * )
 */
export const useDateFilter = (): UseDateFilterReturn => {
  const [searchParams, setSearchParams] = useSearchParams()

  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const dateFieldParam = searchParams.get('dateField')
  const presetParam = searchParams.get('preset')

  // Date range filter is fully derived from URL params - no separate state to sync
  // Depend on the primitive param values, not `searchParams` itself, which react-router
  // gives a new object identity on every render even when the URL is unchanged.
  const dateRangeFilter = useMemo<DateRangeFilter>(() => {
    if (!startDateParam && !endDateParam && !presetParam) {
      return DEFAULT_DATE_RANGE_FILTER
    }

    return {
      preset: (presetParam as DateRangeFilter['preset']) || 'custom',
      startDate: startDateParam,
      endDate: endDateParam,
      dateField: dateFieldParam === 'updatedAt' ? 'updatedAt' : 'createdAt',
    }
  }, [startDateParam, endDateParam, dateFieldParam, presetParam])

  // Handler for date range change with URL sync
  const handleDateRangeChange = useCallback(
    (newDateRange: DateRangeFilter) => {
      const newSearchParams = new URLSearchParams(searchParams)

      // Update preset
      if (newDateRange.preset !== 'all') {
        newSearchParams.set('preset', newDateRange.preset)
      } else {
        newSearchParams.delete('preset')
      }

      // Update startDate
      if (newDateRange.startDate) {
        newSearchParams.set('startDate', newDateRange.startDate)
      } else {
        newSearchParams.delete('startDate')
      }

      // Update endDate
      if (newDateRange.endDate) {
        newSearchParams.set('endDate', newDateRange.endDate)
      } else {
        newSearchParams.delete('endDate')
      }

      // Update dateField
      if (newDateRange.dateField !== 'createdAt') {
        newSearchParams.set('dateField', newDateRange.dateField)
      } else {
        newSearchParams.delete('dateField')
      }

      setSearchParams(newSearchParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return {
    dateRangeFilter,
    handleDateRangeChange,
  }
}
