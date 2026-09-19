import { Registry } from 'common'
import { KEY_REGISTRY_API_USER_TWO_FACTOR } from 'appAccount/common'
import { getRestClient } from 'registry'

import { UserTwoFactorApi } from '../model'

export function createUserTwoFactorApi() {
  return new UserTwoFactorApi(getRestClient())
}

export const getUserTwoFactorApi = (): UserTwoFactorApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_USER_TWO_FACTOR,
    createUserTwoFactorApi,
  )
}
