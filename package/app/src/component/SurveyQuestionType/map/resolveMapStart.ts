import {
  MAP_ZOOM_COUNTRY,
  MAP_ZOOM_STREET,
  MapStartOptions,
  MapStartView,
  authoredMapCenter,
  resolveMapStartView,
} from 'veysur-common'

import type { MapProvider } from './MapProvider'

/** How long to wait for the geocoder before opening on the world. */
export const START_TIMEOUT_MS = 2500
const CITY_ZOOM = 10

export interface BrowserHints {
  /** `navigator.languages`, for example `['en-GB', 'en']`. */
  languages: readonly string[]
  /** An IANA time zone, for example `Europe/London`. */
  timeZone: string | undefined
}

export function readBrowserHints(): BrowserHints {
  let timeZone: string | undefined
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    timeZone = undefined
  }
  return { languages: navigator.languages ?? [navigator.language], timeZone }
}

/** The first two-letter region in the browser's language list, upper-cased. */
function regionOf(languages: readonly string[]): string | null {
  for (const tag of languages) {
    try {
      const region = new Intl.Locale(tag).region
      if (region) return region.toUpperCase()
    } catch {
      continue
    }
  }
  return null
}

function countryName(region: string): string | null {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(region) ?? null
  } catch {
    return null
  }
}

/** `Europe/London` gives `London`; zones with no city (`UTC`, `Etc/GMT+1`) give null. */
function cityOf(timeZone: string | undefined): string | null {
  if (!timeZone || !timeZone.includes('/') || timeZone.startsWith('Etc/')) {
    return null
  }
  return timeZone.split('/').pop()!.replace(/_/g, ' ')
}

/**
 * The device position, but only when the browser has already been allowed to
 * share it, so opening a map never triggers a permission prompt.
 */
export async function readGrantedPosition(): Promise<{
  lat: number
  lng: number
} | null> {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' })
    if (status?.state !== 'granted') return null
    return await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => resolve(null),
        { timeout: START_TIMEOUT_MS },
      ),
    )
  } catch {
    return null
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    promise
      .then(resolve, () => resolve(null))
      .finally(() => clearTimeout(timer))
  })
}

interface Input {
  options: MapStartOptions
  provider: MapProvider
  /** An existing answer already says where to open. */
  hasAnswer: boolean
  hints: BrowserHints
  /** Supplied only where the device position may be used. */
  devicePosition?: () => Promise<{ lat: number; lng: number } | null>
}

/**
 * Where a map opens: the author's centre and zoom if a centre is set (a zoom
 * alone is ignored, so it cannot override the automatic choices below); then the device position at
 * street level if the browser already allows it; otherwise a guess from the
 * browser's own settings, never from the network address. The time zone's
 * city within the language's country if both are known, else the country,
 * placed by the map's geocoder. If nothing is known, or the geocoder fails or
 * is slow, the world.
 */
export async function resolveMapStart({
  options,
  provider,
  hasAnswer,
  hints,
  devicePosition,
}: Input): Promise<MapStartView> {
  const fallback = resolveMapStartView(options)
  if (authoredMapCenter(options) || hasAnswer) return fallback

  const device = await withTimeout(
    devicePosition?.() ?? Promise.resolve(null),
    START_TIMEOUT_MS,
  )
  if (device) {
    return {
      ...device,
      zoom: MAP_ZOOM_STREET,
    }
  }

  const region = regionOf(hints.languages)
  const country = region ? countryName(region) : null
  const city = cityOf(hints.timeZone)
  const queries: Array<{ text: string; zoom: number }> = []
  if (city && country) {
    queries.push({ text: `${city}, ${country}`, zoom: CITY_ZOOM })
  }
  if (country) queries.push({ text: country, zoom: MAP_ZOOM_COUNTRY })

  for (const query of queries) {
    const found = await withTimeout(
      provider.search(query.text, region ? [region] : []),
      START_TIMEOUT_MS,
    )
    const place = found?.[0]
    if (place) {
      return {
        lat: place.lat,
        lng: place.lng,
        zoom: query.zoom,
      }
    }
  }
  return fallback
}
