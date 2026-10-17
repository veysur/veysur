export type MapProviderName = 'osm' | 'google'

export interface GeocodeResult {
  lat: number
  lng: number
  address: string
  countryCode?: string
}

export interface ReverseGeocodeResult {
  address?: string
  countryCode?: string
}

export interface MapViewOptions {
  lat: number
  lng: number
  zoom: number
  onPick: (lat: number, lng: number) => void
}

export interface MapViewHandle {
  /** Places the single pin and pans the map to it. */
  /** With `zoom`, the map also zooms in to at least that level. */
  setPin: (lat: number, lng: number, zoom?: number) => void
  clearPin: () => void
  destroy: () => void
}

/**
 * What the map question needs from a map service. The question component
 * knows nothing about Leaflet or Google, so a provider is swappable.
 */
export interface MapProvider {
  readonly name: MapProviderName
  createMap: (
    element: HTMLElement,
    options: MapViewOptions,
  ) => Promise<MapViewHandle>
  /** `countries` is a list of ISO 3166 alpha-2 codes; empty means anywhere. */
  search: (query: string, countries: string[]) => Promise<GeocodeResult[]>
  reverse: (lat: number, lng: number) => Promise<ReverseGeocodeResult | null>
}
