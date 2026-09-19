import { Registry } from 'common'
import { KEY_REGISTRY_API_PROJECT_ADMIN_INVITE } from 'appAccount/common'
import { getRestClient } from 'registry'

import { ProjectAdminInviteApi } from '../model'

export function createProjectAdminInviteApi() {
  return new ProjectAdminInviteApi(getRestClient())
}

export const getProjectAdminInviteApi = (): ProjectAdminInviteApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_PROJECT_ADMIN_INVITE,
    createProjectAdminInviteApi,
  )
}
