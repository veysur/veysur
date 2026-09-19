import { Registry } from 'common'
import { KEY_REGISTRY_API_TEAM_MANAGEMENT } from 'appAdmin/common'
import { getRestClient } from 'registry'

import { TeamManagementApi } from '../model'

export function createTeamManagementApi() {
  return new TeamManagementApi(getRestClient())
}

export const getTeamManagementApi = (): TeamManagementApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_TEAM_MANAGEMENT,
    createTeamManagementApi,
  )
}
