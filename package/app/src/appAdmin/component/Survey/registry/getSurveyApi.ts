import { Registry } from 'common'
import { KEY_REGISTRY_API_SURVEY } from 'appAdmin/common'
import { getRestClient } from 'registry'

import { SurveyApi } from '../model'

export function createSurveyApi() {
  return new SurveyApi(getRestClient())
}

export const getSurveyApi = (): SurveyApi => {
  return Registry.getInstance().get(KEY_REGISTRY_API_SURVEY, createSurveyApi)
}
