import { Registry } from 'common'
import { getRestClient } from 'registry'

import { SurveySnapshotApi } from '../model'

const KEY_REGISTRY_API_SURVEY_SNAPSHOT = 'api:survey-snapshot'

export function createSurveySnapshotApi() {
  return new SurveySnapshotApi(getRestClient())
}

export const getSurveySnapshotApi = (): SurveySnapshotApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_SURVEY_SNAPSHOT,
    createSurveySnapshotApi,
  )
}
