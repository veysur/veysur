import {
  MAP_PROVIDER_DEFAULT,
  MAP_PROVIDER_GOOGLE,
  MAP_PROVIDER_OSM,
} from './MapAnswer'

export interface MapDeploymentConfig {
  /** `osm` or `google`; anything else falls back to `osm`. */
  providerDefault?: string
  googleApiKey?: string
}

export interface ResolvedMapConfig {
  /** The deployment default, always `osm` or `google`. */
  provider: typeof MAP_PROVIDER_OSM | typeof MAP_PROVIDER_GOOGLE
  /** The project key when set, otherwise the deployment key. */
  googleApiKey: string
}

/** Settings resolved against the deployment, returned beside the stored survey settings. */
export interface EffectiveSettingSurvey {
  maps: ResolvedMapConfig
  /** What a survey's own key resolves against; maps above is the project's view */
  mapsDeployment: MapDeploymentConfig
}

export function resolveMapConfig(
  deployment: MapDeploymentConfig,
  projectGoogleApiKey?: string | null,
): ResolvedMapConfig {
  const googleApiKey =
    projectGoogleApiKey?.trim() || deployment.googleApiKey?.trim() || ''
  const wantsGoogle = deployment.providerDefault === MAP_PROVIDER_GOOGLE
  return {
    provider:
      wantsGoogle && googleApiKey ? MAP_PROVIDER_GOOGLE : MAP_PROVIDER_OSM,
    googleApiKey,
  }
}

/**
 * The provider a question really uses. A question may ask for Google, but
 * without a key it falls back to OpenStreetMap.
 */
export function resolveQuestionMapProvider(
  questionProvider: string | undefined,
  config: ResolvedMapConfig,
): typeof MAP_PROVIDER_OSM | typeof MAP_PROVIDER_GOOGLE {
  const wanted =
    !questionProvider || questionProvider === MAP_PROVIDER_DEFAULT
      ? config.provider
      : questionProvider
  return wanted === MAP_PROVIDER_GOOGLE && config.googleApiKey
    ? MAP_PROVIDER_GOOGLE
    : MAP_PROVIDER_OSM
}
