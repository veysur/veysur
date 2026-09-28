import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'
import { getNotificationApi } from '../registry'
import { KEY_STATE_NOTIFICATIONS } from 'appAdmin/common/keyState'

/**
 * Marks a notification read - called for each unread notification visible
 * when the bell panel opens. Supersedes the old localStorage-based
 * useAcknowledgedJobIds tracking: the server's `status` field is now the
 * real source of truth for the unread badge count.
 */
export function useMarkNotificationRead() {
  const mutation = useInvalidatingMutation({
    mutationFn: async (notificationId: string) => {
      await getNotificationApi().markRead(notificationId)
    },
    invalidateKeys: [[KEY_STATE_NOTIFICATIONS]],
  })

  return {
    markRead: mutation.mutateAsync,
  }
}
