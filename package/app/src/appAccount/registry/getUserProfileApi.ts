import { Registry } from 'common'
import { KEY_REGISTRY_API_USER_PROFILE } from 'appAccount/common'
import { getRestClient } from 'registry'

import { UserProfileApi } from '../model'

export function createUserProfileApi() {
  return new UserProfileApi(getRestClient())
}

export const getUserProfileApi = (): UserProfileApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_USER_PROFILE,
    createUserProfileApi,
  )
}
