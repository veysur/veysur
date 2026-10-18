/// <reference types="google.maps" />
import {
  MapAuthError,
  MapProvider,
  MapViewHandle,
  MapViewOptions,
} from './MapProvider'

const SCRIPT_URL = 'https://maps.googleapis.com/maps/api/js'

const scriptLoads = new Map<string, Promise<void>>()

let authFailed = false
const authFailureListeners = new Set<() => void>()

/**
 * Google reports a rejected key (blocked API, wrong referrer, billing off)
 * only through this global callback, after the script has loaded.
 */
function watchAuthFailure() {
  Reflect.set(window, 'gm_authFailure', () => {
    authFailed = true
    console.error(
      'Google Maps rejected the API key. Check its API and referrer restrictions: https://developers.google.com/maps/documentation/javascript/error-messages',
    )
    authFailureListeners.forEach((listener) => listener())
  })
}

/** Maps a geocoder denial to `MapAuthError`; other errors pass through. */
async function guarded<T>(request: () => Promise<T>): Promise<T> {
  if (authFailed) throw new MapAuthError()
  try {
    return await request()
  } catch (error) {
    if (authFailed || Reflect.get(Object(error), 'code') === 'REQUEST_DENIED') {
      throw new MapAuthError()
    }
    throw error
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  const cached = scriptLoads.get(apiKey)
  if (cached) return cached

  const load = new Promise<void>((resolve, reject) => {
    if (window.google?.maps) {
      resolve()
      return
    }
    watchAuthFailure()
    const script = document.createElement('script')
    script.src = `${SCRIPT_URL}?${new URLSearchParams({ key: apiKey, loading: 'async' })}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
  load.catch(() => scriptLoads.delete(apiKey))
  scriptLoads.set(apiKey, load)
  return load
}

function toResult(result: google.maps.GeocoderResult) {
  const country = result.address_components.find((component) =>
    component.types.includes('country'),
  )
  return {
    address: result.formatted_address,
    countryCode: country?.short_name?.toUpperCase(),
  }
}

export class GoogleProvider implements MapProvider {
  readonly name = 'google' as const

  constructor(private readonly apiKey: string) {}

  async createMap(
    element: HTMLElement,
    { lat, lng, zoom, onPick, onError }: MapViewOptions,
  ): Promise<MapViewHandle> {
    await loadGoogleMaps(this.apiKey)
    const { Map } = await google.maps.importLibrary('maps')
    const map = new Map(element, {
      center: { lat, lng },
      zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    const onAuthFailure = () => onError?.(new MapAuthError())
    authFailureListeners.add(onAuthFailure)
    if (authFailed) onAuthFailure()

    let pin: google.maps.Marker | null = null
    const listener = map.addListener(
      'click',
      (event: google.maps.MapMouseEvent) => {
        if (event.latLng) onPick(event.latLng.lat(), event.latLng.lng())
      },
    )

    return {
      setPin: (pinLat, pinLng, zoom) => {
        const position = { lat: pinLat, lng: pinLng }
        if (pin) pin.setPosition(position)
        else pin = new google.maps.Marker({ map, position })
        map.panTo(position)
        if (zoom !== undefined) map.setZoom(Math.max(map.getZoom() ?? 0, zoom))
      },
      clearPin: () => {
        pin?.setMap(null)
        pin = null
      },
      destroy: () => {
        authFailureListeners.delete(onAuthFailure)
        listener?.remove()
        pin?.setMap(null)
      },
    }
  }

  async search(query: string, countries: string[]) {
    await loadGoogleMaps(this.apiKey)
    // The typings accept one country per restriction; with several, search
    // everywhere and keep only the listed countries.
    const { results } = await guarded(() =>
      new google.maps.Geocoder().geocode({
        address: query,
        componentRestrictions:
          countries.length === 1 ? { country: countries[0] } : undefined,
      }),
    )
    return results
      .map((result) => ({
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        ...toResult(result),
      }))
      .filter(
        (result) =>
          countries.length === 0 ||
          (result.countryCode !== undefined &&
            countries.includes(result.countryCode)),
      )
  }

  async reverse(lat: number, lng: number) {
    await loadGoogleMaps(this.apiKey)
    const { results } = await guarded(() =>
      new google.maps.Geocoder().geocode({ location: { lat, lng } }),
    )
    return results.length > 0 ? toResult(results[0]) : null
  }
}
