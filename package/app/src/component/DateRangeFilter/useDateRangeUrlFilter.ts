import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { DateRangeFilter, DEFAULT_DATE_RANGE_FILTER } from './types'

export interface UseDateRangeUrlFilterParams {
  startParam?: string
  endParam?: string
}

/**
 * Reads a date-range filter (preset/start/end) from the URL and derives the
 * DateRangeFilter used by FilterToolbar. startParam/endParam let callers
 * match their own query-string naming (e.g. startDate/endDate vs dateFrom/dateTo).
 */
export function useDateRangeUrlFilter({
  startParam = 'startDate',
  endParam = 'endDate',
}: UseDateRangeUrlFilterParams = {}) {
  const [searchParams] = useSearchParams()
  const preset = searchParams.get('preset') ?? ''
  const startDate = searchParams.get(startParam) ?? ''
  const endDate = searchParams.get(endParam) ?? ''

  const dateRangeFilter = useMemo<DateRangeFilter>(() => {
    if (!startDate && !endDate && !preset) {
      return DEFAULT_DATE_RANGE_FILTER
    }
    return {
      preset: (preset as DateRangeFilter['preset']) || 'custom',
      startDate: startDate || null,
      endDate: endDate || null,
      dateField: 'createdAt',
    }
  }, [preset, startDate, endDate])

  const applyDateRangeToParams = useCallback(
    (params: URLSearchParams, date: DateRangeFilter) => {
      if (date.preset !== 'all') {
        params.set('preset', date.preset)
      } else {
        params.delete('preset')
      }
      if (date.startDate) {
        params.set(startParam, date.startDate)
      } else {
        params.delete(startParam)
      }
      if (date.endDate) {
        params.set(endParam, date.endDate)
      } else {
        params.delete(endParam)
      }
    },
    [startParam, endParam],
  )

  return { dateRangeFilter, startDate, endDate, applyDateRangeToParams }
}
