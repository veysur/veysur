import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'
import React from 'react'

import { useListPageUrlFilters } from './useListPageUrlFilters'

const createWrapper = (initialEntries: string[]) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries }, children)
  }

const renderListPageFilters = (
  initialEntries: string[],
  filterValue: string,
) => {
  return renderHook(
    () => {
      const [searchParams, setSearchParams] = useSearchParams()
      const setPage = jest.fn()
      const result = useListPageUrlFilters({
        filterDeps: [filterValue],
        setPage,
        setSearchParams,
        hasFilters: !!filterValue,
      })
      return { ...result, searchParams, setPage }
    },
    { wrapper: createWrapper(initialEntries) },
  )
}

describe('useListPageUrlFilters', () => {
  it('resets to page 1 when a filter dep changes', () => {
    const setPage = jest.fn()
    const { rerender } = renderHook(
      ({ filterValue }: { filterValue: string }) => {
        const [, setSearchParams] = useSearchParams()
        useListPageUrlFilters({
          filterDeps: [filterValue],
          setPage,
          setSearchParams,
          hasFilters: !!filterValue,
        })
      },
      {
        wrapper: createWrapper(['/']),
        initialProps: { filterValue: '' },
      },
    )

    setPage.mockClear()

    rerender({ filterValue: 'projectA' })

    expect(setPage).toHaveBeenCalledWith(1)
  })

  it('does not reset page when unrelated re-renders happen', () => {
    const setPage = jest.fn()
    const { rerender } = renderHook(
      ({ filterValue }: { filterValue: string }) => {
        const [, setSearchParams] = useSearchParams()
        useListPageUrlFilters({
          filterDeps: [filterValue],
          setPage,
          setSearchParams,
          hasFilters: !!filterValue,
        })
      },
      {
        wrapper: createWrapper(['/']),
        initialProps: { filterValue: 'projectA' },
      },
    )

    setPage.mockClear()
    rerender({ filterValue: 'projectA' })

    expect(setPage).not.toHaveBeenCalled()
  })

  it('clearFilters clears the URL search params', () => {
    const { result } = renderListPageFilters(['/?projectId=abc'], 'abc')

    expect(result.current.searchParams.get('projectId')).toBe('abc')

    act(() => {
      result.current.clearFilters()
    })

    expect(result.current.searchParams.toString()).toBe('')
  })

  it('passes through hasFilters', () => {
    const { result } = renderListPageFilters(['/'], '')
    expect(result.current.hasFilters).toBe(false)

    const { result: resultWithFilter } = renderListPageFilters(
      ['/?projectId=abc'],
      'abc',
    )
    expect(resultWithFilter.current.hasFilters).toBe(true)
  })
})
