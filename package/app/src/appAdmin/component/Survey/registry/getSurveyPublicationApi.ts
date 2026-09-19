import { Registry } from 'common'
import { getRestClient } from 'registry'

import { SurveyPublicationApi } from '../model'

const KEY_REGISTRY_API_PUBLICATION = 'api:publication'

export function createPublicationApi() {
  return new SurveyPublicationApi(getRestClient())
}

export const getPublicationApi = (): SurveyPublicationApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_PUBLICATION,
    createPublicationApi,
  )
}
