import { Registry } from 'common'
import { getRestClient } from 'registry'

import { KEY_REGISTRY_API_SURVEY_PARTICIPANT_ATTRIBUTE_SNAPSHOT } from 'appSurvey/common/keyRegistry'
import { SurveyParticipantAttributeSnapshotApi } from 'appSurvey/api/SurveyParticipantAttributeSnapshotApi'

export function createSurveyParticipantAttributeSnapshotApi() {
  return new SurveyParticipantAttributeSnapshotApi(getRestClient())
}

export const getSurveyParticipantAttributeSnapshotApi =
  (): SurveyParticipantAttributeSnapshotApi => {
    return Registry.getInstance().get(
      KEY_REGISTRY_API_SURVEY_PARTICIPANT_ATTRIBUTE_SNAPSHOT,
      createSurveyParticipantAttributeSnapshotApi,
    )
  }
