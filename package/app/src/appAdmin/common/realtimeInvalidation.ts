import { REALTIME_EVENT_NOTIFICATION_CHANGED } from 'veysur-common'

import type { RealtimeInvalidationMap } from 'hook/useRealtimeInvalidation'

import { KEY_STATE_NOTIFICATIONS } from './keyState'

/** One row per realtime event type the admin app reacts to. */
export const ADMIN_REALTIME_INVALIDATION: RealtimeInvalidationMap = {
  [REALTIME_EVENT_NOTIFICATION_CHANGED]: [[KEY_STATE_NOTIFICATIONS]],
}
