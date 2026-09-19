import { Registry } from 'common'
import { getRestClient } from 'registry'
import { KEY_REGISTRY_API_SURVEY_STATS } from 'appAdmin/common'

import { SurveyStatsApi } from '../model/api/SurveyStatsApi'

export function createSurveyStatsApi() {
  return new SurveyStatsApi(getRestClient())
}

export const getSurveyStatsApi = (): SurveyStatsApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_SURVEY_STATS,
    createSurveyStatsApi,
  )
}
