import { useEffect, useMemo, useRef } from 'react'
import type { Query } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'

import { useProjectDomain } from 'appAdmin/hook'
import { useFlashMessage } from 'component/FlashMessage'
import { getNotificationApi } from '../registry'
import { KEY_STATE_NOTIFICATIONS } from 'appAdmin/common/keyState'
import type {
  NotificationListItem,
  ListNotificationsResponse,
} from '../model/api/NotificationApi'

// The worker is only invoked once a minute by its k8s CronJob, so polling
// faster than that just adds load without a chance of seeing a status
// change any sooner.
const POLL_INTERVAL_MS = 15 * 1000

const isActive = (notification: NotificationListItem) =>
  notification.dataTransferJobStatus === 'pending' ||
  notification.dataTransferJobStatus === 'processing'

/**
 * Data source for the DataTransferNotificationBell: the calling admin's own
 * notifications, polling while any related job is still in progress. A
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
    refetchInterval: (query: Query<ListNotificationsResponse>) => {
      const notifications = query.state.data?.notifications ?? []
      const hasActive = notifications.some(isActive)
      return hasActive ? POLL_INTERVAL_MS : false
    },
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
