import { useEffect, useMemo, useRef } from 'react'
import { useAuthdQuery } from 'hook/useAuthdQuery'

import { useProjectDomain } from 'appAdmin/hook'
import { useFlashMessage } from 'component/FlashMessage'
import { getNotificationApi } from '../registry'
import { KEY_STATE_NOTIFICATIONS } from 'appAdmin/common/keyState'
import type {
  NotificationListItem,
  ListNotificationsResponse,
} from '../model/api/NotificationApi'

/**
 * Data source for the DataTransferNotificationBell: the calling admin's own
 * notifications. Updates arrive as realtime `notification.changed` hints
 * (see SocketProvider and appAdmin/common/realtimeInvalidation.ts), not polling. A
 * notification's `level` moves 'info' -> 'success'/'error' server-side as
 * its related DataTransferJob settles (see ServiceDataTransferJob), so a
 * one-off toast fires the first time a given notification is observed at a
 * settled level, in addition to the persistent bell/panel record
 * (notifications never disappear from the panel just because a toast was
 * missed).
 */
export function useNotifications() {
  const project = useProjectDomain()
  const { showFlashMessage } = useFlashMessage()
  const previousLevelRef = useRef<Map<string, NotificationListItem['level']>>(
    new Map(),
  )

  const query = useAuthdQuery<ListNotificationsResponse>({
    queryKey: [KEY_STATE_NOTIFICATIONS, project?._id],
    queryFn: async () => {
      if (!project?._id) return { notifications: [], notificationCount: 0 }
      return getNotificationApi().listNotifications()
    },
    enabled: !!project?._id,
  })

  const notifications = useMemo(
    () => query.data?.notifications ?? [],
    [query.data],
  )

  useEffect(() => {
    for (const notification of notifications) {
      const previousLevel = previousLevelRef.current.get(
        notification.notificationId,
      )
      const justSettled =
        previousLevel &&
        previousLevel !== notification.level &&
        (notification.level === 'success' || notification.level === 'error')

      if (justSettled) {
        if (notification.level === 'success') {
          showFlashMessage(
            'success',
            `${notification.title} - ${notification.message ?? 'ready to download.'}`,
            { dedupKey: notification.notificationId },
          )
        } else {
          showFlashMessage(
            'error',
            notification.message ?? `${notification.title} failed.`,
            { dedupKey: notification.notificationId },
          )
        }
      }
      previousLevelRef.current.set(notification.notificationId, notification.level)
    }
  }, [notifications, showFlashMessage])

  return {
    notifications,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
