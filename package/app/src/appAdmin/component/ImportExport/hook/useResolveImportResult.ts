import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useFlashMessage } from 'component/FlashMessage'
import { KEY_STATE_NOTIFICATIONS } from 'appAdmin/common/keyState'

import type {
  ProcessImportResponse,
  ImportJobEnqueuedResponse,
} from '../model/api/ImportExportApi'

/**
 * Shared by every import mutation hook to resolve a processImport() result.
 *
 * Small imports complete inline and already carry a ProcessImportResponse.
 * Async-eligible imports (over ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES) only get
 * a jobId back: rather than blocking the mutation on ServiceDataTransferJob
 * polling for up to five minutes, this fires an immediate toast and lets
 * the DataTransferNotificationBell's own poll pick the job up - mirrors
 * useStartExportDownload's handling of the equivalent export case.
 */
export function useResolveImportResult() {
  const queryClient = useQueryClient()
  const { showFlashMessage } = useFlashMessage()

  return useCallback(
    async (
      result: ProcessImportResponse | ImportJobEnqueuedResponse,
    ): Promise<ProcessImportResponse | undefined> => {
      if ('async' in result) {
        showFlashMessage(
          'info',
          result.alreadyQueued
            ? 'This file is already queued for import - check notifications for the result.'
            : 'File queued for import - check notifications for the result.',
        )
        await queryClient.invalidateQueries({
          queryKey: [KEY_STATE_NOTIFICATIONS],
        })
        return undefined
      }

      return result
    },
    [queryClient, showFlashMessage],
  )
}
