import { DataSourceContext } from 'mzen-om'
import { File } from 'veysur-common'
import { RepoFile } from 'model'
import { createStorageAdaptor, objectExists } from 'common'
import { StorageConfig } from './FileS3Config'

export interface FileContext {
  surveyId?: string | null
  responseId?: string | null
  type?: InstanceType<typeof File>['fileContext']
}

export interface DeduplicationResult {
  file: File | null
  contextMatches: boolean
}

/**
 * Find existing file by hash with optional context matching
 */
export async function findExistingFile(
  repoFile: RepoFile,
  fileHash: string,
  context: FileContext,
  dataSourceContext: DataSourceContext,
): Promise<DeduplicationResult> {
  return await repoFile.findByHashWithContext(
    fileHash,
    {
      surveyId: context.surveyId || null,
      responseId: context.responseId || null,
      type: context.type || null,
    },
    { context: dataSourceContext },
  )
}

/**
 * Find existing image set by hash of the edited variant (for deduplication)
 * Includes soft-deleted records — resurrection is handled by the caller.
 */
export async function findExistingImageSet(
  repoFile: RepoFile,
  fileHash: string,
  surveyId: string | null,
  fileContext: InstanceType<typeof File>['fileContext'] | null,
  dataSourceContext: DataSourceContext,
): Promise<File | null> {
  return await repoFile.findByImageSetHash(fileHash, surveyId, fileContext, {
    context: dataSourceContext,
  })
}

/**
 * Handle file resurrection - file was soft-deleted, now being re-uploaded
 */
export async function handleFileResurrection(
  repoFile: RepoFile,
  file: File,
  storageConfig: StorageConfig,
  filename: string,
  userId: string,
  context: DataSourceContext,
): Promise<{ resurrected: boolean; needsReupload: boolean }> {
  const now = new Date()

  await repoFile.updateOne(
    { _id: file._id },
    {
      $set: {
        deletedAt: null,
        filename,
        createdById: userId,
        updatedAt: now,
        refs: null,
      },
    },
    { context },
  )

  if (!file.uploadedAt) {
    return { resurrected: true, needsReupload: true }
  }

  const adaptor = createStorageAdaptor(storageConfig)
  const bucketType = file.bucketType || 'public'
  const bucket =
    bucketType === 'private'
      ? storageConfig.privateBucket
      : storageConfig.publicBucket
  const exists = await objectExists(adaptor, bucket, file.filePath)

  if (exists) {
    return { resurrected: true, needsReupload: false }
  } else {
    await repoFile.updateOne(
      { _id: file._id },
      { $set: { uploadedAt: null } },
      { context },
    )
    return { resurrected: true, needsReupload: true }
  }
}

/**
 * Handle image set resurrection - all variants were soft-deleted, now being re-uploaded.
 * Resurrects the edited record and all sibling records (original + thumb) with the same imageSetId.
 */
export async function handleImageSetResurrection(
  repoFile: RepoFile,
  editedFile: File,
  storageConfig: StorageConfig,
  userId: string,
  context: DataSourceContext,
): Promise<{ resurrected: boolean; needsReupload: boolean }> {
  const now = new Date()

  await repoFile.updateMany(
    { imageSetId: editedFile.imageSetId },
    {
      $set: {
        deletedAt: null,
        refs: null,
        createdById: userId,
        updatedAt: now,
      },
    },
    { context },
  )

  const adaptor = createStorageAdaptor(storageConfig)
  const exists = await objectExists(
    adaptor,
    storageConfig.publicBucket,
    editedFile.filePath,
  )

  if (!exists) {
    await repoFile.updateMany(
      { imageSetId: editedFile.imageSetId },
      { $set: { uploadedAt: null } },
      { context },
    )
    return { resurrected: true, needsReupload: true }
  }

  return { resurrected: true, needsReupload: false }
}

/**
 * Update existing incomplete upload with new attempt details
 */
export async function updateIncompleteUpload(
  repoFile: RepoFile,
  file: File,
  filename: string,
  userId: string,
  context: DataSourceContext,
): Promise<void> {
  const now = new Date()
  await repoFile.updateOne(
    { _id: file._id },
    {
      $set: {
        filename,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      },
    },
    { context },
  )

  file.filename = filename
  file.createdById = userId
  file.createdAt = now
  file.updatedAt = now
}
