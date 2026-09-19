import { KEY_REGISTRY_FEATURE_GATE_PROVIDER, Registry } from 'common'
import { FeatureGateProvider } from 'model'

const noopFeatureGateProvider: FeatureGateProvider = {
  async getGates() {
    return {}
  },
}

export const getFeatureGateProvider = (): FeatureGateProvider => {
  return Registry.getInstance().get(
    KEY_REGISTRY_FEATURE_GATE_PROVIDER,
    () => noopFeatureGateProvider,
  )
}
