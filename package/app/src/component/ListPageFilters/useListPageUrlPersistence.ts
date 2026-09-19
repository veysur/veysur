import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'

export interface UseListPageUrlPersistenceOptions {
  storageKey: string
}

/**
 * Persists the filter/sort/date-range portion of a list page's URL query
 * string to localStorage (via BrowserPersister, same mechanism as
 * usePaginationPerPage), and restores it when the page is opened with no
 * query string at all. Mirrors the restore-if-missing-on-mount pattern in
 * usePagination.ts, but for the whole filter set rather than just perPage.
 */
export function useListPageUrlPersistence({
  storageKey,
}: UseListPageUrlPersistenceOptions): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const restored = useRef(false)
  const [ready, setReady] = useState(false)

  // Captured once, on the very first render, before usePagination's own
  // mount-time default-fill (or anything else) has had a chance to write
  // page/per-page into the URL — this is the only reliable way to ask
  // "did the page load with zero query params" once other writers settle.
  const initialSearchRef = useRef<string | null>(null)
  if (initialSearchRef.current === null) {
    initialSearchRef.current = searchParams.toString()
  }

  const queryKey = useMemo(() => ['listPageFilters', storageKey], [storageKey])

  const { data: persisted, isLoading } = useQuery<string>({
    queryKey,
    queryFn: () => '',
    staleTime: Infinity,
    gcTime: Infinity,
    meta: {
      persistence: {
        enabled: true,
        storageType: 'local',
      },
    },
  })

  useEffect(() => {
    setReady(true)
  }, [])

  // Deferred by one render pass (the `ready` flip) so this is the only
  // setSearchParams call in its effect flush. On mount, usePagination's
  // default page/per-page fill (and previously the page-reset effect) also
  // call setSearchParams — react-router's setSearchParams computes its next
  // value from the `searchParams` snapshot captured at that render, so
  // multiple such calls in the same flush don't compose; whichever lands
  // last wins and silently drops the others' params. Waiting a tick lets
  // those settle first, then this merges persisted filters on top of the
  // settled state instead of racing it.
  useEffect(() => {
    if (restored.current || isLoading || !ready) {
      return
    }
    restored.current = true

    if (initialSearchRef.current === '' && persisted) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          new URLSearchParams(persisted).forEach((value, key) => {
            next.set(key, value)
          })
          return next
        },
        { replace: true },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, guarded by restored ref; setSearchParams reads the latest prev at that point
  }, [isLoading, ready, persisted])

  useEffect(() => {
    if (!restored.current) {
      return
    }

    const next = new URLSearchParams(searchParams)
    next.delete('page')
    next.delete('per-page')
    queryClient.setQueryData(queryKey, next.toString())
    // isLoading is included so this effect re-evaluates right after the
    // restore effect flips `restored.current` to true — that ref mutation
    // alone wouldn't otherwise trigger a re-run since it isn't reactive state.
  }, [searchParams, queryClient, queryKey, isLoading])
}
