import { useCallback } from 'react'

import { useAuth } from 'hook/useAuth'
import { useProjectDomain } from 'appAdmin/hook'
import { getFileApi } from 'appAdmin/registry/getFileApi'

/**
 * Fetch a presigned download URL for a file on demand and open it - call
 * from a click handler so the download URL is only ever generated when the
 * user actually requests it, not once per rendered link. `window.open`
 * happens synchronously in the same click-originated task so popup blockers
 * allow it (same pattern as `useStartExportDownload`).
 */
export function useFileDownload() {
  const project = useProjectDomain()
  const { auth } = useAuth()
  const jwtToken = auth?.jwt?.token

  return useCallback(
    async (fileId: string) => {
      if (!project?._id || !jwtToken) return
      const { downloadUrl } = await getFileApi().getDownloadUrl(
        project._id,
        jwtToken,
        fileId,
      )
      window.open(downloadUrl, '_blank')
    },
    [project, jwtToken],
  )
}
