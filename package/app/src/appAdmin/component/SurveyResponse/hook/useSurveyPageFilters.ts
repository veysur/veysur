import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CompletionStatusFilter } from 'veysur-common'
import {
  DateRangeFilter,
  DEFAULT_DATE_RANGE_FILTER,
} from 'component/DateRangeFilter'
import { useResponseFilter, Publication } from './useResponseFilter'

export interface UseSurveyPageFiltersProps {
  publications: Publication[]
  enableDateFilter?: boolean
  enableCompletedFilter?: boolean
}

export interface UseSurveyPageFiltersReturn {
  // Publication filter
  selectedPublicationId: string
  setSelectedPublicationId: (id: string) => void
  getSnapshotIdForData: () => string

  // Date range filter
  dateRangeFilter: DateRangeFilter
  setDateRangeFilter: (filter: DateRangeFilter) => void

  // Completion status filter
  completedFilter: CompletionStatusFilter
  setCompletedFilter: (filter: CompletionStatusFilter) => void

  // Merged status filter
  mergedFilter: 'all' | 'merged' | 'notMerged'
  setMergedFilter: (filter: 'all' | 'merged' | 'notMerged') => void

  // URL sync handlers
  handlePublicationChange: (id: string) => void
  handleDateRangeChange: (filter: DateRangeFilter) => void
  handleCompletedFilterChange: (filter: CompletionStatusFilter) => void
  handleMergedFilterChange: (filter: 'all' | 'merged' | 'notMerged') => void
}

export const useSurveyPageFilters = ({
  publications,
  enableDateFilter = false,
}: UseSurveyPageFiltersProps): UseSurveyPageFiltersReturn => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Compose existing useResponseFilter for publication logic
  const publicationFilter = useResponseFilter({ publications })
  const { setSelectedPublicationId } = publicationFilter

  // Date range filter state
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>(
    DEFAULT_DATE_RANGE_FILTER,
  )

  // Completion status filter state
  const [completedFilter, setCompletedFilter] =
    useState<CompletionStatusFilter>('all')

  // Merged status filter state
  const [mergedFilter, setMergedFilter] = useState<
    'all' | 'merged' | 'notMerged'
  >('all')

  const publicationIdParam = searchParams.get('publicationId')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const dateFieldParam = searchParams.get('dateField')
  const presetParam = searchParams.get('preset')

  // Read URL params on mount and sync to state. This genuinely reacts to an
  // external, non-React-owned data source (the browser URL, which can also
  // change via back/forward navigation) rather than a prop, so it belongs
  // in an effect. Depend on the primitive param values, not `searchParams`
  // itself, which react-router gives a new object identity on every render
  // (e.g. every pagination click) even when these params are unchanged.
  useEffect(() => {
    // Sync publication filter from URL
    if (publicationIdParam) {
      setSelectedPublicationId(publicationIdParam)
    }

    // Sync date range filter from URL (if enabled)
    if (enableDateFilter && (startDateParam || endDateParam || presetParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the browser URL, an external data source outside React's props/state tree
      setDateRangeFilter({
        preset: (presetParam as DateRangeFilter['preset']) || 'custom',
        startDate: startDateParam,
        endDate: endDateParam,
        dateField: dateFieldParam === 'completed' ? 'completed' : 'createdAt',
      })
    }
  }, [
    publicationIdParam,
    startDateParam,
    endDateParam,
    dateFieldParam,
    presetParam,
    enableDateFilter,
    setSelectedPublicationId,
  ])

  // Handler for publication change with URL sync
  const handlePublicationChange = useCallback(
    (newPublicationId: string) => {
      publicationFilter.setSelectedPublicationId(newPublicationId)

      const newSearchParams = new URLSearchParams(searchParams)
      if (newPublicationId) {
        newSearchParams.set('publicationId', newPublicationId)
      } else {
        newSearchParams.delete('publicationId')
      }
      setSearchParams(newSearchParams, { replace: true })
    },
    [publicationFilter, searchParams, setSearchParams],
  )

  // Handler for date range change with URL sync
  const handleDateRangeChange = useCallback(
    (newDateRange: DateRangeFilter) => {
      setDateRangeFilter(newDateRange)

      if (!enableDateFilter) return

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
    [enableDateFilter, searchParams, setSearchParams],
  )

  // Handler for completion filter change with URL sync
  const handleCompletedFilterChange = useCallback(
    (newCompletedFilter: CompletionStatusFilter) => {
      setCompletedFilter(newCompletedFilter)

      // Note: Completion filter is intentionally NOT synced to URL
      // as it's a simpler toggle that doesn't need persistence
    },
    [],
  )

  // Handler for merged filter change
  const handleMergedFilterChange = useCallback(
    (newMergedFilter: 'all' | 'merged' | 'notMerged') => {
      setMergedFilter(newMergedFilter)
    },
    [],
  )

  return {
    // Publication filter (from composed hook)
    selectedPublicationId: publicationFilter.selectedPublicationId,
    setSelectedPublicationId: publicationFilter.setSelectedPublicationId,
    getSnapshotIdForData: publicationFilter.getSnapshotIdForData,

    // Date range filter
    dateRangeFilter,
    setDateRangeFilter,

    // Completion status filter
    completedFilter,
    setCompletedFilter,

    // Merged status filter
    mergedFilter,
    setMergedFilter,

    // URL sync handlers
    handlePublicationChange,
    handleDateRangeChange,
    handleCompletedFilterChange,
    handleMergedFilterChange,
  }
}
