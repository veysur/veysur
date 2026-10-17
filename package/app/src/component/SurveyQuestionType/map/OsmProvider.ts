// cspell:ignore Nominatim latlng jsonv
import { MapProvider, MapViewHandle, MapViewOptions } from './MapProvider'

// Rsbuild only substitutes PUBLIC_ variables that are set at build time; an unset
// one stays a bare `process.env` read, which throws in the browser.
function readBuildEnv(read: () => string | undefined): string | undefined {
  try {
    return read()
  } catch {
    return undefined
  }
}

export const OSM_TILE_URL =
  readBuildEnv(() => process.env.PUBLIC_MAP_OSM_TILE_URL) ||
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const GEOCODER_URL = (
  readBuildEnv(() => process.env.PUBLIC_MAP_OSM_GEOCODER_URL) ||
  'https://nominatim.openstreetmap.org'
).replace(/\/+$/, '')
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const SEARCH_LIMIT = 5

type NominatimAddress = { country_code?: string }
type NominatimSearchItem = {
  lat: string
  lon: string
  display_name: string
  address?: NominatimAddress
}
type NominatimReverse = {
  display_name?: string
  address?: NominatimAddress
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`)
  return (await response.json()) as T
}

export class OsmProvider implements MapProvider {
  readonly name = 'osm' as const

  async createMap(
    element: HTMLElement,
    { lat, lng, zoom, onPick }: MapViewOptions,
  ): Promise<MapViewHandle> {
    const [{ default: L }] = await Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ])

    const map = L.map(element).setView([lat, lng], zoom)
    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map)

    let pin: L.CircleMarker | null = null
    map.on('click', (event: L.LeafletMouseEvent) =>
      onPick(event.latlng.lat, event.latlng.lng),
    )

    return {
      setPin: (pinLat, pinLng, zoom) => {
        if (pin) pin.setLatLng([pinLat, pinLng])
        else {
          pin = L.circleMarker([pinLat, pinLng], {
            radius: 9,
            weight: 3,
            color: '#ffffff',
            fillColor: '#1d4ed8',
            fillOpacity: 1,
          }).addTo(map)
        }
        if (zoom === undefined) map.panTo([pinLat, pinLng])
        else map.setView([pinLat, pinLng], Math.max(map.getZoom(), zoom))
      },
      clearPin: () => {
        pin?.remove()
        pin = null
      },
      destroy: () => map.remove(),
    }
  }

  async search(query: string, countries: string[]) {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: String(SEARCH_LIMIT),
    })
    if (countries.length > 0) {
      params.set('countrycodes', countries.join(',').toLowerCase())
    }
    const items = await getJson<NominatimSearchItem[]>(
      `${GEOCODER_URL}/search?${params}`,
    )
    return items.map((item) => ({
      lat: Number(item.lat),
      lng: Number(item.lon),
      address: item.display_name,
      countryCode: item.address?.country_code?.toUpperCase(),
    }))
  }

  async reverse(lat: number, lng: number) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '10',
    })
    const item = await getJson<NominatimReverse>(
      `${GEOCODER_URL}/reverse?${params}`,
    )
    return {
      address: item.display_name,
      countryCode: item.address?.country_code?.toUpperCase(),
    }
  }
}
