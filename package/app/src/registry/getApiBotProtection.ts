import { KEY_REGISTRY_API_BOT_PROTECTION, Registry } from 'common'
import { ApiBotProtection } from 'model'

import { getRestClient } from './getRestClient'

export function createApiBotProtection() {
  return new ApiBotProtection(getRestClient())
}

export function getApiBotProtection() {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_BOT_PROTECTION,
    createApiBotProtection,
  )
}
