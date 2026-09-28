import { DataTransferJob } from 'veysur-common'

import { RepoFile } from 'model/repo/core/RepoFile'
import {
  createStorageAdaptor,
  generateSignedDownloadUrl,
  contextForProject,
  StorageConfig,
} from 'common'

/**
 * Shared by ServiceDataTransferJob.getStatus()/listJobs() and
 * ServiceNotification.list(): once a job is completed, resolve its
 * resultFileId to a fresh signed download URL (the same
 * generateSignedDownloadUrl path ServiceFileTempDownload uses) rather than
 * storing one on the job row, since a URL signed at completion time could
 * expire before the client gets around to polling it.
 *
 * A completed job whose File can't be found, or whose deletedAt (the expiry
 * sentinel this codebase uses for temp/export files, not a deletion flag)
 * isn't set, is an anomaly rather than "still processing" - completion only
 * happens after compileExport() has already created that File. Surfaced as
 * `error` so a caller polling job status doesn't wait forever for a
 * downloadUrl that will never arrive; a caller that doesn't need that (the
 * notification list) can ignore it.
 */
export async function resolveDataTransferFileDownload(
  {
    status,
    resultFileId,
    projectId,
    requestHost,
    requestProto,
  }: {
    status: DataTransferJob['status']
    resultFileId: string | null
    projectId: string
    requestHost?: string | null
    requestProto?: string | null
  },
  deps: { repoFile: RepoFile; storageConfig: StorageConfig },
): Promise<{
  downloadUrl?: string
  filename?: string
  expiresAt?: Date
  error?: string
}> {
  if (status !== 'completed' || !resultFileId) {
    return {}
  }

  const dsContext = contextForProject(projectId)
  const file = await deps.repoFile.findOne(
    { _id: resultFileId },
    { context: dsContext },
  )
  if (!file || !file.deletedAt) {
    return { error: 'Export file is no longer available' }
  }

  const effectiveConfig =
    requestHost && requestProto
      ? { ...deps.storageConfig, publicBaseUrl: `${requestProto}://${requestHost}` }
      : deps.storageConfig
  const adaptor = createStorageAdaptor(effectiveConfig)
  const expiresInSeconds = Math.max(
    60,
    Math.floor((file.deletedAt.getTime() - Date.now()) / 1000),
  )
  const downloadUrl = await generateSignedDownloadUrl(
    effectiveConfig,
    adaptor,
    effectiveConfig.privateBucket,
    file.filePath,
    { expiresIn: expiresInSeconds, filename: file.filename },
  )

  return { downloadUrl, filename: file.filename, expiresAt: file.deletedAt }
}
