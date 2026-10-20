import { KEY_REGISTRY_EXTRA_GTAG_CONFIGS, Registry } from 'common'
import type { ExtraGtagConfig } from 'model'

// Extra gtag destinations an extension configures after core's analytics tag.
export const getExtraGtagConfigs = (): ExtraGtagConfig[] => {
  return Registry.getInstance().get(KEY_REGISTRY_EXTRA_GTAG_CONFIGS, () => [])
}
