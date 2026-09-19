import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

/**
 * Hook to persist perPage preference using react-query's persistence system
 * @param key - Unique key for this perPage preference (e.g., 'survey-list-perPage')
 * @param defaultValue - Default value if no preference is stored
 */
export function usePaginationPerPage(key: string, defaultValue: number) {
  const queryClient = useQueryClient()

  const queryKey = useMemo(() => ['paginationPerPage', key], [key])

  // Use react-query with BrowserPersister for persistence
  const { data: perPage, isLoading } = useQuery<number>({
    queryKey,
    queryFn: () => {
      // Only runs if no cached data exists (first visit or cache cleared)
      return defaultValue
    },
    staleTime: Infinity, // Never refetch
    gcTime: Infinity, // Never garbage collect (prevents loss during navigation)
    meta: {
      persistence: {
        enabled: true,
        storageType: 'local', // Persists across sessions via BrowserPersister
      },
    },
  })

  // Function to update the perPage value
  const setPersistedPerPage = useCallback(
    (newPerPage: number) => {
      // Update react-query cache (BrowserPersister automatically saves to localStorage)
      queryClient.setQueryData(queryKey, newPerPage)
    },
    [queryClient, queryKey],
  )

  return {
    perPage: perPage ?? defaultValue,
    setPersistedPerPage,
    isLoading,
  }
}
