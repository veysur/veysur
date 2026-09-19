import { Registry } from 'common'
import { KEY_REGISTRY_API_SURVEY_PARTICIPANT } from 'appAdmin/common'
import { getRestClient } from 'registry'

import { SurveyParticipantApi } from '../model'

export function createSurveyParticipantApi() {
  return new SurveyParticipantApi(getRestClient())
}

export const getSurveyParticipantApi = (): SurveyParticipantApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_SURVEY_PARTICIPANT,
    createSurveyParticipantApi,
  )
}
