import { Registry } from 'common'
import { getRestClient } from 'registry'

import { KEY_REGISTRY_API_SURVEY_RESPONSE } from 'appSurvey/common/keyRegistry'
import { SurveyParticipantResponseApi } from 'appSurvey/api/SurveyParticipantResponseApi'

export function createSurveyResponseApi() {
  return new SurveyParticipantResponseApi(getRestClient())
}

export const getSurveyParticipantResponseApi =
  (): SurveyParticipantResponseApi => {
    return Registry.getInstance().get(
      KEY_REGISTRY_API_SURVEY_RESPONSE,
      createSurveyResponseApi,
    )
  }
