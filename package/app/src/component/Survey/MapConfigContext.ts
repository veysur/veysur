import { createContext, useContext } from 'react'
import { MAP_PROVIDER_OSM, ResolvedMapConfig } from 'veysur-common'

export type MapConfigContextValue = ResolvedMapConfig & {
  /** Anonymous surveys accept only approximate pins and never use device location. */
  anonymous: boolean
  /** Embedded surveys wait for a click before any map service is contacted. */
  deferLoad: boolean
}

export const MapConfigContext = createContext<MapConfigContextValue>({
  provider: MAP_PROVIDER_OSM,
  googleApiKey: '',
  anonymous: false,
  deferLoad: false,
})

export const useMapConfig = () => useContext(MapConfigContext)
