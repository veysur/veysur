// cspell:ignore Artia
/**
 * IP-API
 * https://www.ip-api.com/
 * Artia International S.R.L.
 * Bucharest, Romania
 */
import type { IpLocation } from '../IpLocation'
import type { IpLookupProvider } from '../IpLookupProvider'

const IP_API_FIELDS =
  'country,countryCode,region,regionName,city,lat,lon,timezone,status'

interface IpApiResponse {
  status: string
  country?: string
  countryCode?: string
  region?: string
  regionName?: string
  city?: string
  lat?: number
  lon?: number
  timezone?: string
}

export class IpApiProvider implements IpLookupProvider {
  readonly providerName = 'ip-api'

  async lookup(ip: string): Promise<IpLocation | null> {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=${IP_API_FIELDS}`,
    )
    const result = (await response.json()) as IpApiResponse
    if (result?.status !== 'success') return null
    return {
      country: result.country,
      countryCode: result.countryCode,
      region: result.regionName,
      regionCode: result.region,
      city: result.city,
      lat: result.lat,
      lon: result.lon,
      timezone: result.timezone,
    }
  }
}
