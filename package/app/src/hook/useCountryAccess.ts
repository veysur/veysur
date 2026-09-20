import { useQuery } from '@tanstack/react-query'

import { getGeoApi } from 'registry'

/**
 * Resolves whether the current visitor is in a country VeySur cannot
 * legally serve (no local legal representation — see
 * package/api/docs/country-blocking.md).
 *
 * Detection is by IP geolocation via platform/geo/access-check. The browser
 * locale is NOT used as an independent blocking source: if the access-check
 * call fails, access fails open (not blocked), since the app already depends
 * on the API being reachable for everything else.
 */
export function useCountryAccess(): { blocked: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['countryAccess'],
    queryFn: async () => {
      try {
        return await getGeoApi().accessCheck()
      } catch {
        return { country: '', blocked: false }
      }
    },
    staleTime: Infinity,
    meta: { persistence: { storageType: 'session' } },
  })

  return { blocked: data?.blocked ?? false, isLoading }
}
