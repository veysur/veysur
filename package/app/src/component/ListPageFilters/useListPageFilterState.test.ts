import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import React from 'react'

import { DateRangeFilter } from 'component/DateRangeFilter'

import { useListPageFilterState } from './useListPageFilterState'

const createWrapper = (initialEntries: string[]) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries }, children)
  }

const dateRangeFilter: DateRangeFilter = {
  preset: 'all',
  startDate: null,
  endDate: null,
  dateField: 'createdAt',
}

const applyDateRangeToParams = jest.fn(
  (params: URLSearchParams, date: DateRangeFilter) => {
    if (date.preset === 'all') {
      params.delete('preset')
    } else {
      params.set('preset', date.preset)
    }
  },
)

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
]

const renderFilterState = (
  initialEntries: string[],
  extraFields?: Parameters<typeof useListPageFilterState>[0]['extraFields'],
) =>
  renderHook(
    () => {
      const [searchParams, setSearchParams] = useSearchParams()
      const result = useListPageFilterState({
        searchParams,
        setSearchParams,
        dateRangeFilter,
        applyDateRangeToParams,
        extraFields,
      })
      return { ...result, searchParams }
    },
    { wrapper: createWrapper(initialEntries) },
  )

describe('useListPageFilterState', () => {
  afterEach(() => {
    applyDateRangeToParams.mockClear()
  })

  it('always includes the date field, plus any extra fields', () => {
    const { result } = renderFilterState(
      ['/'],
      [
        {
          key: 'status',
          label: 'Status',
          options: STATUS_OPTIONS,
          allLabel: 'All statuses',
        },
      ],
    )

    expect(result.current.filterFields).toEqual([
      {
        type: 'dateRange',
        key: 'date',
        label: 'Date',
        showDateFieldSelector: false,
      },
      {
        type: 'select',
        key: 'status',
        label: 'Status',
        options: STATUS_OPTIONS,
        allLabel: 'All statuses',
      },
    ])
  })

  it('reads extra field values from the URL', () => {
    const { result } = renderFilterState(
      ['/?status=paid'],
      [
        {
          key: 'status',
          label: 'Status',
          options: STATUS_OPTIONS,
          allLabel: 'All statuses',
        },
      ],
    )

    expect(result.current.filterValues).toEqual({
      date: dateRangeFilter,
      status: 'paid',
    })
  })

  it('reads extra field values from a custom urlParam', () => {
    const { result } = renderFilterState(
      ['/?statusFilter=paid'],
      [
        {
          key: 'status',
          label: 'Status',
          options: STATUS_OPTIONS,
          allLabel: 'All statuses',
          urlParam: 'statusFilter',
        },
      ],
    )

    expect(result.current.filterValues.status).toBe('paid')
  })

  it('handleFilterApply sets extra field params and clears page', () => {
    const { result } = renderFilterState(
      ['/?page=3'],
      [
        {
          key: 'status',
          label: 'Status',
          options: STATUS_OPTIONS,
          allLabel: 'All statuses',
        },
      ],
    )

    act(() => {
      result.current.handleFilterApply({
        date: dateRangeFilter,
        status: 'paid',
      })
    })

    expect(result.current.searchParams.get('status')).toBe('paid')
    expect(result.current.searchParams.get('page')).toBeNull()
  })

  it('handleFilterApply clears an extra field when set to "all"', () => {
    const { result } = renderFilterState(
      ['/?status=paid'],
      [
        {
          key: 'status',
          label: 'Status',
          options: STATUS_OPTIONS,
          allLabel: 'All statuses',
        },
      ],
    )

    act(() => {
      result.current.handleFilterApply({ date: dateRangeFilter, status: 'all' })
    })

    expect(result.current.searchParams.get('status')).toBeNull()
  })

  it('setParam sets a param and clears page', () => {
    const { result } = renderFilterState(['/?page=2'])

    act(() => {
      result.current.setParam('projectId', 'abc')
    })

    expect(result.current.searchParams.get('projectId')).toBe('abc')
    expect(result.current.searchParams.get('page')).toBeNull()
  })

  it('setParam clears a param when given an empty value', () => {
    const { result } = renderFilterState(['/?projectId=abc'])

    act(() => {
      result.current.setParam('projectId', '')
    })

    expect(result.current.searchParams.get('projectId')).toBeNull()
  })
})
