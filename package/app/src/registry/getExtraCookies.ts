import { KEY_REGISTRY_EXTRA_COOKIES, Registry } from 'common'
import type { ExtraCookies } from 'model'

// Cookies an overlay sets, listed in the consent banner alongside core's.
export const getExtraCookies = (): ExtraCookies => {
  return Registry.getInstance().get(KEY_REGISTRY_EXTRA_COOKIES, () => ({}))
}
