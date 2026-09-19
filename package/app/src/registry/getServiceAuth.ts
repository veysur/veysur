import { KEY_REGISTRY_API_AUTH, Registry } from 'common'
import { ApiAuth } from 'model'

import { getRestClient } from './getRestClient'

export function createApiAuth() {
  return new ApiAuth(getRestClient())
}

export function getApiAuth() {
  return Registry.getInstance().get(KEY_REGISTRY_API_AUTH, createApiAuth)
}
