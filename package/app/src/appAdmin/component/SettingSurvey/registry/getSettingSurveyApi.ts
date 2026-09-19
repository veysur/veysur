import { Registry } from 'common'
import { getRestClient } from 'registry'

import { SettingSurveyApi } from '../model'

const KEY_REGISTRY_API_SETTING_SURVEY = 'api-setting-survey'

export function createSettingSurveyApi() {
  return new SettingSurveyApi(getRestClient())
}

export const getSettingSurveyApi = (): SettingSurveyApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_SETTING_SURVEY,
    createSettingSurveyApi,
  )
}
