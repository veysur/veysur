import { useQueryClient } from '@tanstack/react-query'

import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'
import { useProjectDomain } from 'appAdmin/hook'
import { getNotificationApi } from '../registry'
import { KEY_STATE_NOTIFICATIONS } from 'appAdmin/common/keyState'
import type { ListNotificationsResponse } from '../model/api/NotificationApi'

/**
 * Removes a notification from the panel - the manual dismiss action. Unlike
 * the old delete-the-job behaviour, this never touches the related
 * DataTransferJob row; that row's lifecycle is owned entirely by
 * ServiceNotification.cleanupOld().
 *
 * Removes the row from the cache optimistically (onMutate) so the panel
 * updates the instant the button is clicked, rather than waiting on the
 * round trip + invalidated refetch; rolls back on failure.
 */
export function useDismissNotification() {
  const queryClient = useQueryClient()
  const project = useProjectDomain()
  const queryKey = [KEY_STATE_NOTIFICATIONS, project?._id]

  const mutation = useInvalidatingMutation({
    mutationFn: async (notificationId: string) => {
      await getNotificationApi().dismiss(notificationId)
    },
    invalidateKeys: [[KEY_STATE_NOTIFICATIONS]],
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey })
      const previous =
        queryClient.getQueryData<ListNotificationsResponse>(queryKey)
      if (previous) {
        queryClient.setQueryData<ListNotificationsResponse>(queryKey, {
          ...previous,
          notifications: previous.notifications.filter(
            (notification) => notification.notificationId !== notificationId,
          ),
        })
      }
      return { previous }
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
  })

  return {
    dismissNotification: mutation.mutateAsync,
    isDismissing: mutation.isPending,
  }
}
