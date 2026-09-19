import { Registry } from 'common'
import { KEY_REGISTRY_API_SURVEY_RESPONSE } from 'appAdmin/common'
import { getRestClient } from 'registry'

import { SurveyResponseApi } from '../model'

export function createSurveyResponseApi() {
  return new SurveyResponseApi(getRestClient())
}

export const getSurveyResponseApi = (): SurveyResponseApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_SURVEY_RESPONSE,
    createSurveyResponseApi,
  )
}
