import { useQuery } from '@tanstack/react-query'

import { getGeoApi } from 'registry'

/**
 * Countries VeySur currently cannot legally serve (see
 * package/api/docs/country-blocking.md). Used to disable, rather than
 * remove, blocked options in country selects so the reason is discoverable.
 */
export function useBlockedCountries(): { blockedCountries: string[] } {
  const { data } = useQuery({
    queryKey: ['blockedCountries'],
    queryFn: async () => {
      try {
        return await getGeoApi().blockedCountries()
      } catch {
        return { countries: [] }
      }
    },
    staleTime: Infinity,
    meta: { persistence: { storageType: 'local' } },
  })

  return { blockedCountries: data?.countries ?? [] }
}
