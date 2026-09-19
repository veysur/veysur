import { Registry } from 'common'
import { getRestClient } from '@/registry'

import { KEY_REGISTRY_API_AUTH_PARTICIPANT } from 'appSurvey/common/keyRegistry'
import { AuthParticipantApi } from 'appSurvey/api/AuthParticipantApi'

export function createAuthParticipantApi() {
  return new AuthParticipantApi(getRestClient())
}

export const getAuthParticipantApi = (): AuthParticipantApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_AUTH_PARTICIPANT,
    createAuthParticipantApi,
  )
}
