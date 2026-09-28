import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useFlashMessage } from 'component/FlashMessage'
import { KEY_STATE_NOTIFICATIONS } from 'appAdmin/common/keyState'

import type {
  ExportEntityResponse,
  ExportJobEnqueuedResponse,
} from '../model/api/ImportExportApi'

/**
 * Shared by every export mutation hook to resolve an exportEntity() result.
 *
 * Synchronous formats already have a downloadUrl and open it immediately -
 * that window.open() happens inside the same click-originated task, so
 * popup blockers allow it. Async-eligible formats (.vssa/.vssp) only get a
 * jobId back: rather than blocking the mutation on ServiceDataTransferJob
 * polling and then calling window.open() long after the user gesture (which
 * popup blockers silently swallow), this fires an immediate toast and lets
 * the DataTransferNotificationBell's own poll pick the job up - completion
 * is downloaded from there via a real `<a download>` click, never
 * window.open().
 */
export function useStartExportDownload() {
  const queryClient = useQueryClient()
  const { showFlashMessage } = useFlashMessage()

  return useCallback(
    async (result: ExportEntityResponse | ExportJobEnqueuedResponse) => {
      if ('async' in result) {
        showFlashMessage(
          'info',
          result.alreadyQueued
            ? 'This export is already in progress - check notifications for the download when it is ready.'
            : 'Preparing your export - check notifications for the download when it is ready.',
        )
        await queryClient.invalidateQueries({
          queryKey: [KEY_STATE_NOTIFICATIONS],
        })
        return
      }

      window.open(result.downloadUrl, '_blank')
    },
    [queryClient, showFlashMessage],
  )
}
