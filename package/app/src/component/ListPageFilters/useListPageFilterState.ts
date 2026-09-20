import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { DateRangeFilter } from 'component/DateRangeFilter'
import { FilterFieldConfig, FilterValues } from 'component/FilterToolbar'

type SetSearchParams = ReturnType<typeof useSearchParams>[1]

export interface ListPageExtraFilterField {
  key: string
  label: string
  options: { value: string; label: string }[]
  allLabel: string
  /** URL search param name, if different from `key`. */
  urlParam?: string
}

export interface UseListPageFilterStateOptions {
  searchParams: URLSearchParams
  setSearchParams: SetSearchParams
  /** Omit to build a page with no date-range filter field. */
  dateRangeFilter?: DateRangeFilter
  applyDateRangeToParams?: (
    params: URLSearchParams,
    date: DateRangeFilter,
  ) => void
  /** Non-date select filters shown in the FilterToolbar popover, e.g. status. */
  extraFields?: ListPageExtraFilterField[]
}

export interface UseListPageFilterStateReturn {
  filterFields: FilterFieldConfig[]
  filterValues: FilterValues
  handleFilterApply: (values: FilterValues) => void
  /** Sets or clears a single URL param (used by free-text ID filter inputs) and resets to page 1. */
  setParam: (key: string, value: string) => void
}

/**
 * Builds the FilterToolbar field/value config and apply handler shared by the
 * list pages that filter by a date range and select fields, across every
 * sub-app. Every page has the same date-range field plus zero or more
 * extra select fields (status, project); this hook generalises that shape.
 * Free-text ID filter inputs render page-local (via IdFilterInput) since they
 * use the returned `setParam` directly rather than going through FilterToolbar.
 */
export function useListPageFilterState({
  searchParams,
  setSearchParams,
  dateRangeFilter,
  applyDateRangeToParams,
  extraFields = [],
}: UseListPageFilterStateOptions): UseListPageFilterStateReturn {
  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      ...(dateRangeFilter
        ? [
            {
              type: 'dateRange' as const,
              key: 'date',
              label: 'Date',
              showDateFieldSelector: false,
            },
          ]
        : []),
      ...extraFields.map((field): FilterFieldConfig => ({
        type: 'select',
        key: field.key,
        label: field.label,
        options: field.options,
        allLabel: field.allLabel,
      })),
    ],
    [dateRangeFilter, extraFields],
  )

  const filterValues: FilterValues = useMemo(
    () => ({
      ...(dateRangeFilter ? { date: dateRangeFilter } : {}),
      ...Object.fromEntries(
        extraFields.map((field) => [
          field.key,
          searchParams.get(field.urlParam ?? field.key) ?? '',
        ]),
      ),
    }),
    [dateRangeFilter, searchParams, extraFields],
  )

  const handleFilterApply = (values: FilterValues) => {
    const date = values.date as DateRangeFilter

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (applyDateRangeToParams && date) {
          applyDateRangeToParams(next, date)
        }
        extraFields.forEach((field) => {
          const value = values[field.key] as string
          const param = field.urlParam ?? field.key
          if (value && value !== 'all') {
            next.set(param, value)
          } else {
            next.delete(param)
          }
        })
        next.delete('page')

        return next
      },
      { replace: true },
    )
  }

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete('page')
    setSearchParams(next)
  }

  return { filterFields, filterValues, handleFilterApply, setParam }
}
