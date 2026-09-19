import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'

import { useListPageUrlSort } from './useListPageUrlSort'

const createWrapper = (initialEntries: string[]) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries }, children)
  }

describe('useListPageUrlSort', () => {
  it('returns a stable sortState reference across unrelated re-renders', () => {
    // sortState feeds into useListPageState's filterDeps, whose consumer
    // (useListPageUrlFilters) resets the page on ANY dependency identity
    // change. A fresh object here every render — even with unchanged
    // key/direction — would reset the page (and change the URL) on every
    // render, triggering another render, ad infinitum.
    const { result, rerender } = renderHook(
      () => useListPageUrlSort({ defaultSortKey: 'created' }),
      { wrapper: createWrapper(['/']) },
    )

    const firstSortState = result.current.sortState
    rerender()

    expect(result.current.sortState).toBe(firstSortState)
  })

  it('returns a new sortState reference when the sort changes', () => {
    const { result } = renderHook(
      () => useListPageUrlSort({ defaultSortKey: 'created' }),
      { wrapper: createWrapper(['/']) },
    )

    const firstSortState = result.current.sortState
    expect(firstSortState).toEqual({ key: 'created', direction: 'desc' })

    act(() => {
      result.current.handleSortChange('name', 'asc')
    })

    expect(result.current.sortState).toEqual({ key: 'name', direction: 'asc' })
    expect(result.current.sortState).not.toBe(firstSortState)
  })
})
