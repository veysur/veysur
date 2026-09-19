import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePaginationPerPage } from './usePaginationPerPage'

export interface UsePaginationOptions {
  defaultPage?: number // use -1 to start on the last page (requires totalItems)
  totalItems?: number // total item count; required when defaultPage === -1
  defaultPerPage?: number
  scrollToTop?: boolean
  storageKey?: string // localStorage key for persisting perPage preference
}

export interface UsePaginationReturn {
  page: number
  perPage: number
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  isLoading: boolean
}

export const usePagination = (
  options: UsePaginationOptions = {},
): UsePaginationReturn => {
  const {
    defaultPage = 1,
    totalItems,
    defaultPerPage = 10,
    scrollToTop = true,
    storageKey = 'global',
  } = options

  const [searchParams, setSearchParams] = useSearchParams()
  const initialized = useRef(false)

  // Use react-query to persist perPage preference
  const {
    perPage: persistedPerPage,
    setPersistedPerPage,
    isLoading: isLoadingPersistedPerPage,
  } = usePaginationPerPage(storageKey, defaultPerPage)

  // Initialize URL params if they don't exist, using persisted perPage value
  // Wait for persisted cache to load before initializing
  useEffect(() => {
    // Don't initialize until persisted cache has loaded
    if (isLoadingPersistedPerPage) {
      return
    }

    // When defaultPage === -1 (start on last page), wait until totalItems is known
    if (defaultPage === -1 && !totalItems) {
      return
    }

    if (!initialized.current) {
      initialized.current = true
      const hasPage = searchParams.has('page')
      const hasPerPage = searchParams.has('per-page')

      // Only initialize if URL params are missing
      if (!hasPage || !hasPerPage) {
        const resolvedDefaultPage =
          defaultPage === -1
            ? Math.ceil((totalItems ?? 0) / persistedPerPage) || 1
            : defaultPage

        setSearchParams(
          (prev) => {
            const newParams = new URLSearchParams(prev)
            if (!hasPage) {
              newParams.set('page', String(resolvedDefaultPage))
            }
            if (!hasPerPage) {
              newParams.set('per-page', String(persistedPerPage))
            }
            return newParams
          },
          { replace: true },
        )
      }
    }
  }, [
    isLoadingPersistedPerPage,
    persistedPerPage,
    searchParams,
    defaultPage,
    totalItems,
    setSearchParams,
  ])

  // Read directly from URL as source of truth
  const page = parseInt(searchParams.get('page') || String(defaultPage), 10)
  const perPage = parseInt(
    searchParams.get('per-page') || String(persistedPerPage),
    10,
  )

  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev)
          newParams.set('page', String(newPage))
          return newParams
        },
        { replace: true },
      )
      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [setSearchParams, scrollToTop],
  )

  const setPerPage = useCallback(
    (newPerPage: number) => {
      // Persist using react-query
      setPersistedPerPage(newPerPage)

      setSearchParams(
        (prev) => {
          const newParams = new URLSearchParams(prev)
          newParams.set('page', '1')
          newParams.set('per-page', String(newPerPage))
          return newParams
        },
        { replace: true },
      )
      if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [setSearchParams, scrollToTop, setPersistedPerPage],
  )

  return useMemo(
    () => ({
      page,
      perPage,
      setPage,
      setPerPage,
      isLoading: isLoadingPersistedPerPage,
    }),
    [page, perPage, setPage, setPerPage, isLoadingPersistedPerPage],
  )
}

export default usePagination
