import { QUESTION_TYPE_MAP } from '../constructor/Survey/attributeMeta/types'

export const MAP_PROVIDER_DEFAULT = 'default'
export const MAP_PROVIDER_OSM = 'osm'
export const MAP_PROVIDER_GOOGLE = 'google'

export const MAP_PROVIDERS = [
  MAP_PROVIDER_DEFAULT,
  MAP_PROVIDER_OSM,
  MAP_PROVIDER_GOOGLE,
] as const

export type MapProviderChoice = (typeof MAP_PROVIDERS)[number]

export const MAP_PRECISION_EXACT = 'exact'
export const MAP_PRECISION_COARSE = 'coarse'

export const MAP_PRECISIONS = [
  MAP_PRECISION_EXACT,
  MAP_PRECISION_COARSE,
] as const

export type MapPrecision = (typeof MAP_PRECISIONS)[number]

/** One decimal place of latitude or longitude is about 11 km. */
export const MAP_COARSE_DECIMALS = 1
export const MAP_ADDRESS_MAX_LENGTH = 500
export const MAP_ZOOM_MIN = 1
export const MAP_ZOOM_MAX = 18

/** A map question answer: a single pin. */
export interface MapAnswer {
  lat: number
  lng: number
  precision: MapPrecision
  address?: string
  /** ISO 3166 alpha-2, as reported by the geocoder. Client supplied. */
  countryCode?: string
}

export interface MapAnswerRules {
  /** Comma-separated ISO 3166 alpha-2 codes; empty means any country. */
  countries?: string
  /** The precision the answer must have. Anonymous surveys force coarse. */
  precision?: string
}

export type MapAnswerIssue = 'invalid' | 'precision' | 'country'

export function parseMapCountries(countries?: string): string[] {
  return (countries ?? '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
}

export function roundMapCoordinate(value: number, precision: string): number {
  if (precision !== MAP_PRECISION_COARSE) return value
  const factor = 10 ** MAP_COARSE_DECIMALS
  return Math.round(value * factor) / factor
}

/**
 * The precision a question really uses: anonymous surveys always get coarse,
 * since an exact pin can identify a participant.
 */
export function effectiveMapPrecision(
  precision: string | undefined,
  anonymous: boolean,
): MapPrecision {
  return anonymous || precision === MAP_PRECISION_COARSE
    ? MAP_PRECISION_COARSE
    : MAP_PRECISION_EXACT
}

/** Rounds a pin to the given precision. Coarse answers also drop the address. */
export function toMapAnswer(
  lat: number,
  lng: number,
  precision: string,
  extra: { address?: string; countryCode?: string } = {},
): MapAnswer {
  const coarse = precision === MAP_PRECISION_COARSE
  const answer: MapAnswer = {
    lat: roundMapCoordinate(lat, precision),
    lng: roundMapCoordinate(lng, precision),
    precision: coarse ? MAP_PRECISION_COARSE : MAP_PRECISION_EXACT,
  }
  if (extra.countryCode) answer.countryCode = extra.countryCode.toUpperCase()
  if (!coarse && extra.address) answer.address = extra.address
  return answer
}

export function isMapAnswer(value: unknown): value is MapAnswer {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const { lat, lng } = value as Record<string, unknown>
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

/** Returns the first problem with an answer, or null when it is acceptable. */
export function findMapAnswerIssue(
  value: unknown,
  rules: MapAnswerRules = {},
): MapAnswerIssue | null {
  if (!isMapAnswer(value)) return 'invalid'
  const { address, countryCode } = value
  if (address !== undefined && typeof address !== 'string') return 'invalid'
  if (typeof address === 'string' && address.length > MAP_ADDRESS_MAX_LENGTH) {
    return 'invalid'
  }
  if (countryCode !== undefined && typeof countryCode !== 'string') {
    return 'invalid'
  }

  if (rules.precision === MAP_PRECISION_COARSE) {
    const rounded =
      roundMapCoordinate(value.lat, MAP_PRECISION_COARSE) === value.lat &&
      roundMapCoordinate(value.lng, MAP_PRECISION_COARSE) === value.lng
    if (value.precision !== MAP_PRECISION_COARSE || !rounded || address) {
      return 'precision'
    }
  }

  const allowed = parseMapCountries(rules.countries)
  if (allowed.length > 0) {
    if (!countryCode || !allowed.includes(countryCode.toUpperCase())) {
      return 'country'
    }
  }
  return null
}

export function isMapStatsCompatibleType(type: string): boolean {
  return type === QUESTION_TYPE_MAP
}

export const MAP_ZOOM_STREET = 17
export const MAP_ZOOM_CITY = 11
export const MAP_ZOOM_COUNTRY = 5
export const MAP_ZOOM_WORLD = 3
export const MAP_WORLD_CENTER = { lat: 20, lng: 0 } as const

export interface MapStartOptions {
  centerLat?: number | null
  centerLng?: number | null
  zoom?: number | null
}

/** A position the author chose for the map to open on, or null for automatic. */
export function authoredMapCenter(
  options: MapStartOptions,
): { lat: number; lng: number } | null {
  const { centerLat, centerLng } = options
  return typeof centerLat === 'number' &&
    Number.isFinite(centerLat) &&
    typeof centerLng === 'number' &&
    Number.isFinite(centerLng)
    ? { lat: centerLat, lng: centerLng }
    : null
}

export interface MapStartView {
  lat: number
  lng: number
  zoom: number
}

/**
 * Where a map opens when nothing better is known: the author's centre, else
 * the world. The author's zoom belongs to the author's centre, so with no
 * centre it is ignored and each automatic start picks a zoom to suit itself.
 */
export function resolveMapStartView(options: MapStartOptions): MapStartView {
  const authored = authoredMapCenter(options)
  if (!authored) return { ...MAP_WORLD_CENTER, zoom: MAP_ZOOM_WORLD }
  return {
    ...authored,
    zoom: typeof options.zoom === 'number' ? options.zoom : MAP_ZOOM_COUNTRY,
  }
}
