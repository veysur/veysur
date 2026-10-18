import { Registry } from 'common'
import { KEY_REGISTRY_API_SETTING_PROJECT } from 'appAdmin/common'
import { getRestClient } from 'registry/getRestClient'

import { SettingProjectApi } from 'appAdmin/api/SettingProjectApi'

export function createSettingProjectApi() {
  return new SettingProjectApi(getRestClient())
}

export function getSettingProjectApi(): SettingProjectApi {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_SETTING_PROJECT,
    createSettingProjectApi,
  )
}

export default getSettingProjectApi
