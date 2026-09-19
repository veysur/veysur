import { Registry, KEY_REGISTRY_API_GEO } from 'common'
import { GeoApi } from 'model/api'

import { getRestClient } from './getRestClient'

export function createGeoApi() {
  return new GeoApi(getRestClient())
}

export const getGeoApi = (): GeoApi => {
  return Registry.getInstance().get(KEY_REGISTRY_API_GEO, createGeoApi)
}
