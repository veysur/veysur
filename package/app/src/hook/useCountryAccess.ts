import { useQuery } from '@tanstack/react-query'

import { getGeoApi } from 'registry'

import { useAuth } from './useAuth'

/**
 * Resolves whether the current visitor is in a country VeySur cannot
 * legally serve (no local legal representation — see
 * package/api/docs/country-blocking.md).
 *
 * Detection priority mirrors useBillingCountry:
 * 1. Saved billing address country (immediate, no API call)
 * 2. IP geolocation via platform/geo/access-check
 * 3. Browser locale is NOT used as an independent blocking source — if the
 *    access-check call fails, access fails open (not blocked), since the
 *    app already depends on the API being reachable for everything else.
 */
export function useCountryAccess(): { blocked: boolean; isLoading: boolean } {
  const { auth } = useAuth()
  const savedCountry = auth?.user?.billingAddress?.country

  const { data, isLoading } = useQuery({
    queryKey: ['countryAccess', savedCountry ?? null],
    queryFn: async () => {
      try {
        return await getGeoApi().accessCheck(savedCountry)
      } catch {
        return { country: '', blocked: false }
      }
    },
    staleTime: Infinity,
    meta: { persistence: { storageType: 'session' } },
  })

  return { blocked: data?.blocked ?? false, isLoading }
}
