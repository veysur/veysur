import { useEffect } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'

import { getSocketClient } from 'registry'

/** Maps a realtime event type to the query keys it invalidates. */
export type RealtimeInvalidationMap = Record<string, QueryKey[]>

/**
 * Invalidates the mapped queries when a realtime event arrives, and every mapped
 * query on each (re)connect so anything missed while disconnected is refetched.
 */
export function useRealtimeInvalidation(map: RealtimeInvalidationMap) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const client = getSocketClient()
    const invalidate = (keys: QueryKey[]) =>
      keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))

    const offEvent = client.onEvent((event) =>
      invalidate(map[event.type] ?? []),
    )
    const offConnect = client.onConnect(() =>
      invalidate(Object.values(map).flat()),
    )
    return () => {
      offEvent()
      offConnect()
    }
  }, [map, queryClient])
}
