import { MapProvider, MapProviderName } from './MapProvider'

/** Loads a provider on demand so Leaflet and the Google loader stay out of the main bundle. */
export async function loadMapProvider(
  name: MapProviderName,
  googleApiKey: string,
): Promise<MapProvider> {
  if (name === 'google') {
    const { GoogleProvider } = await import('./GoogleProvider')
    return new GoogleProvider(googleApiKey)
  }
  const { OsmProvider } = await import('./OsmProvider')
  return new OsmProvider()
}
