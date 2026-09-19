import { Registry } from 'common'
import { getRestClient } from 'registry'

import { KEY_REGISTRY_API_SURVEY_PARTICIPANT } from 'appSurvey/common/keyRegistry'
import { SurveyParticipantSnapshotApi } from '@/appSurvey/api/SurveyParticipantSnapshotApi'

export function createSurveySnapshotApi() {
  return new SurveyParticipantSnapshotApi(getRestClient())
}

export const getSurveyParticipantSnapshotApi =
  (): SurveyParticipantSnapshotApi => {
    return Registry.getInstance().get(
      KEY_REGISTRY_API_SURVEY_PARTICIPANT,
      createSurveySnapshotApi,
    )
  }
