import { Registry } from 'common'
import { KEY_REGISTRY_API_SURVEY_PARTICIPANT_ATTRIBUTE } from 'appAdmin/common'
import { getRestClient } from 'registry'

import { SurveyParticipantAttributeApi } from '../model'

export function createSurveyParticipantAttributeApi() {
  return new SurveyParticipantAttributeApi(getRestClient())
}

export const getSurveyParticipantAttributeApi =
  (): SurveyParticipantAttributeApi => {
    return Registry.getInstance().get(
      KEY_REGISTRY_API_SURVEY_PARTICIPANT_ATTRIBUTE,
      createSurveyParticipantAttributeApi,
    )
  }
