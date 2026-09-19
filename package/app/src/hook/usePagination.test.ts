import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { usePagination } from './usePagination'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, children),
    )
  }
}

describe('usePagination', () => {
  beforeEach(() => {
    // Mock window.scrollTo since jsdom doesn't implement it
    window.scrollTo = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: createWrapper(),
    })

    expect(result.current.page).toBe(1)
    expect(result.current.perPage).toBe(10)
  })

  it('should initialize with custom values', () => {
    const { result } = renderHook(
      () => usePagination({ defaultPage: 3, defaultPerPage: 50 }),
      { wrapper: createWrapper() },
    )

    expect(result.current.page).toBe(3)
    expect(result.current.perPage).toBe(50)
  })

  it('should handle page change', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPage(5)
    })

    expect(result.current.page).toBe(5)
  })

  it('should handle per page change and reset to page 1', () => {
    const { result } = renderHook(() => usePagination({ defaultPage: 5 }), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPerPage(50)
    })

    expect(result.current.perPage).toBe(50)
    expect(result.current.page).toBe(1)
  })

  it('should allow direct page setting', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPage(10)
    })

    expect(result.current.page).toBe(10)
  })

  it('should allow direct perPage setting', () => {
    const { result } = renderHook(() => usePagination(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPerPage(100)
    })

    expect(result.current.perPage).toBe(100)
  })

  it('should scroll to top on page change when scrollToTop is true', () => {
    const { result } = renderHook(() => usePagination({ scrollToTop: true }), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPage(2)
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('should not scroll to top on page change when scrollToTop is false', () => {
    const { result } = renderHook(() => usePagination({ scrollToTop: false }), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPage(2)
    })

    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('should scroll to top on per page change when scrollToTop is true', () => {
    const { result } = renderHook(() => usePagination({ scrollToTop: true }), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPerPage(50)
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
