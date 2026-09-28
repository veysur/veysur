import { Registry } from 'common'
import { KEY_REGISTRY_API_NOTIFICATION } from 'appAdmin/common'
import { getRestClient } from 'registry'

import { NotificationApi } from '../model'

export function createNotificationApi() {
  return new NotificationApi(getRestClient())
}

export const getNotificationApi = (): NotificationApi => {
  return Registry.getInstance().get(
    KEY_REGISTRY_API_NOTIFICATION,
    createNotificationApi,
  )
}
