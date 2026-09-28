import { KEY_REGISTRY_API_AUTH_HANDOFF, Registry } from 'common'
import { ApiAuthHandoff } from 'model'

import { getRestClient } from './getRestClient'

export function createApiAuthHandoff() {
  return new ApiAuthHandoff(getRestClient())
}

export function getApiAuthHandoff() {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_AUTH_HANDOFF,
    createApiAuthHandoff,
  )
}
