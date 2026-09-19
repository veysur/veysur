import { Registry } from 'common'
import { getRestClient } from 'registry'

import { KEY_REGISTRY_API_SURVEY_PARTICIPANT_ME } from 'appSurvey/common/keyRegistry'
import { SurveyParticipantApi } from 'appSurvey/api/SurveyParticipantApi'

export function createSurveyParticipantApi() {
  return new SurveyParticipantApi(getRestClient())
}

export const getSurveyParticipantApi = (): SurveyParticipantApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_SURVEY_PARTICIPANT_ME,
    createSurveyParticipantApi,
  )
}
