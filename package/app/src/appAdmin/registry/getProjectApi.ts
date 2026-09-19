import { Registry } from 'common'
import { KEY_REGISTRY_API_PROJECT } from 'appAdmin/common'
import { getRestClient } from 'registry/getRestClient'

import { ProjectApi } from 'appAdmin/api/ProjectApi'

export function createProjectApi() {
  return new ProjectApi(getRestClient())
}

export function getProjectApi(): ProjectApi {
  return Registry.getInstance().get(KEY_REGISTRY_API_PROJECT, createProjectApi)
}

export default getProjectApi
