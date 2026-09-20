import {
  Service,
  ServerErrorBadRequest,
  ServerErrorNotFound,
} from 'mzen-server'
import { DataSourceContext } from 'mzen-om'
import { File } from 'veysur-common'
import MzenId from 'mzen-id'

import { RepoFile } from 'model'
import { AclContext } from 'model/entity/AclContext'
import { IMAGE_SET_ID_PATTERN } from './constants'
import {
  createStorageAdaptor,
  generateSignedUploadUrl,
  generateStoredFilename,
  generateFilePath,
  generateImageSetBasePath,
  objectExists,
} from 'common'

import { StorageConfig, getStorageConfig } from './FileS3Config'
import {
  findExistingFile,
  findExistingImageSet,
  handleFileResurrection,
  handleImageSetResurrection,
  updateIncompleteUpload,
} from './FileDeduplication'
import { FileReference } from './FileReference'

export interface GenerateUploadUrlResult {
  fileId: string
  uploadUrl: string | null
  existingFile: boolean
  resurrected?: boolean
  filePath?: string
  file?: File
}

export class ServiceFileUpload extends Service {
  constructor() {
    super({ name: 'fileUpload' })
  }

  /**
   * Called before a genuinely new file record is created, so a subclass can
   * reject the write (e.g. a storage limit was reached). No-op in core. Overlay seam.
   *
   * @param fileSizeBytes size of the file about to be stored
   */
  protected async assertStorageForNewFile(
    _projectId: string,
    _fileSizeBytes: number,
  ): Promise<void> {}

  private getStorageConfig(): StorageConfig {
    return getStorageConfig(this.config)
  }

  private validateFileSize(config: StorageConfig, fileSize: number): void {
    if (fileSize > config.maxUploadSize) {
      throw new ServerErrorBadRequest(
        `File size ${fileSize} bytes exceeds maximum allowed size ${config.maxUploadSize} bytes`,
      )
    }
  }

  /**
   * Generate signed upload URL for file upload
   * Handles deduplication, resurrection, and new uploads
   */
  async generateUploadUrl({
    projectId,
    requestHost,
    requestProto,
    filename,
    fileHash,
    fileSize,
    mimeType,
    surveyId,
    responseId,
    fileContext,
    imageSetId,
    imageVariant,
    aclContext,
  }: {
    projectId: string
    requestHost?: string
    requestProto?: string
    filename: string
    fileHash: string
    fileSize: number
    mimeType: string
    surveyId?: string
    responseId?: string
    fileContext?: InstanceType<typeof File>['fileContext']
    imageSetId?: string
    imageVariant?: string
    aclContext: AclContext
  }): Promise<GenerateUploadUrlResult> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const userId = aclContext.jwt._id
    const repoFile = this.getRepo<RepoFile>('file')
    const storageConfig = this.getStorageConfig()
    const effectiveConfig =
      requestHost && requestProto
        ? {
            ...storageConfig,
            publicBaseUrl: `${requestProto}://${requestHost}`,
          }
        : storageConfig

    this.validateFileSize(storageConfig, fileSize)

    // Image set upload — create file records, skip dedup, mark uploaded immediately
    if (imageSetId && imageVariant) {
      if (!IMAGE_SET_ID_PATTERN.test(imageSetId)) {
        throw new ServerErrorBadRequest('Invalid imageSetId format')
      }
      const validVariants = ['edited', 'original', 'thumb']
      if (!validVariants.includes(imageVariant)) {
        throw new ServerErrorBadRequest('Invalid imageVariant')
      }

      const basePath = generateImageSetBasePath(imageSetId, {
        projectId: projectId || null,
        surveyId: surveyId || null,
        responseId: responseId || null,
        fileContext: fileContext || null,
      })
      const filePath = `${basePath}/${imageVariant}.jpg`

      // Dedup check for edited variant: if hash matches an existing image set, skip upload
      if (imageVariant === 'edited' && fileHash) {
        const dedupMatch = await findExistingImageSet(
          repoFile,
          fileHash,
          surveyId || null,
          fileContext || null,
          context,
        )
        if (dedupMatch) {
          if (dedupMatch.deletedAt) {
            const resurrection = await handleImageSetResurrection(
              repoFile,
              dedupMatch,
              storageConfig,
              userId,
              context,
            )
            if (!resurrection.needsReupload) {
              return {
                fileId: dedupMatch._id,
                uploadUrl: null,
                existingFile: true,
                filePath: dedupMatch.filePath,
                file: dedupMatch,
              }
            }
            // S3 object gone — issue a new upload URL for the same path
            const reuploadUrl = await generateSignedUploadUrl(
              effectiveConfig,
              effectiveConfig.publicBucket,
              dedupMatch.filePath,
              900,
            )
            return {
              fileId: dedupMatch._id,
              uploadUrl: reuploadUrl,
              existingFile: false,
              filePath: dedupMatch.filePath,
            }
          }
          return {
            fileId: dedupMatch._id,
            uploadUrl: null,
            existingFile: true,
            filePath: dedupMatch.filePath,
            file: dedupMatch,
          }
        }
      }

      // Check for existing record (edit/undo re-upload to same paths)
      const existingFile = await repoFile.findOne(
        { imageSetId, imageVariant, deletedAt: null },
        { context },
      )

      let fileId: string
      if (existingFile) {
        fileId = existingFile._id
      } else {
        await this.assertStorageForNewFile(projectId, fileSize)
        fileId = MzenId()
        const file = new File({
          _id: fileId,
          filename: `${imageVariant}.jpg`,
          storedFilename: `${imageVariant}.jpg`,
          hash: imageVariant === 'edited' && fileHash ? fileHash : null,
          size: fileSize,
          mimeType: 'image/jpeg',
          filePath,
          uploadedAt: new Date(),
          createdById: userId,
          surveyId: surveyId || null,
          responseId: responseId || null,
          fileContext: fileContext || null,
          bucketType: 'public',
          imageSetId,
          imageVariant,
        })

        await repoFile.create(file, { context })

        if (imageVariant === 'edited' && surveyId) {
          await FileReference.addFileReference(
            repoFile,
            fileId,
            'survey',
            surveyId,
            context,
          )
        }
      }

      const uploadUrl = await generateSignedUploadUrl(
        effectiveConfig,
        effectiveConfig.publicBucket,
        filePath,
        900,
      )

      return {
        fileId,
        uploadUrl,
        existingFile: !!existingFile,
        filePath,
      }
    }

    const { file: existingFile, contextMatches } = await findExistingFile(
      repoFile,
      fileHash,
      {
        surveyId: surveyId || null,
        responseId: responseId || null,
        type: fileContext,
      },
      context,
    )

    if (existingFile && contextMatches) {
      if (existingFile.deletedAt) {
        const resurrection = await handleFileResurrection(
          repoFile,
          existingFile,
          storageConfig,
          filename,
          userId,
          context,
        )

        if (resurrection.resurrected && !resurrection.needsReupload) {
          return {
            fileId: existingFile._id,
            uploadUrl: null,
            existingFile: true,
            resurrected: true,
            file: new File({
              ...existingFile,
              deletedAt: null,
              filename,
              updatedAt: new Date(),
              refs: null,
            }),
          }
        }
      }

      if (existingFile.uploadedAt) {
        return {
          fileId: existingFile._id,
          uploadUrl: null,
          existingFile: true,
          file: existingFile,
        }
      } else {
        await updateIncompleteUpload(
          repoFile,
          existingFile,
          filename,
          userId,
          context,
        )

        const uploadUrl = await generateSignedUploadUrl(
          effectiveConfig,
          storageConfig.publicBucket,
          existingFile.filePath,
          900,
        )

        return {
          fileId: existingFile._id,
          uploadUrl,
          existingFile: false,
          file: existingFile,
        }
      }
    }

    // No match — create new record
    await this.assertStorageForNewFile(projectId, fileSize)
    const fileId = MzenId()
    const storedFilename = generateStoredFilename(filename, fileHash)
    const filePath = generateFilePath(projectId, storedFilename, {
      surveyId: surveyId || null,
      responseId: responseId || null,
      fileContext: fileContext || null,
    })

    const uploadUrl = await generateSignedUploadUrl(
      effectiveConfig,
      effectiveConfig.publicBucket,
      filePath,
      900,
    )

    const file = new File({
      _id: fileId,
      filename,
      storedFilename,
      hash: fileHash,
      size: fileSize,
      mimeType,
      filePath,
      createdById: userId,
      surveyId: surveyId || null,
      responseId: responseId || null,
      fileContext: fileContext || null,
      bucketType: 'public',
    })

    await repoFile.create(file, { context })

    return {
      fileId,
      uploadUrl,
      existingFile: false,
      file,
    }
  }

  /**
   * Confirm file upload by verifying object exists in storage
   */
  async confirmUpload({
    fileId,
    projectId,
    aclContext: _aclContext,
  }: {
    fileId: string
    projectId: string
    aclContext: AclContext
  }): Promise<{ success: boolean; file: File; alreadyConfirmed: boolean }> {
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repoFile = this.getRepo<RepoFile>('file')
    const storageConfig = this.getStorageConfig()

    const file = await repoFile.findOne({ _id: fileId }, { context })
    if (!file) {
      throw new ServerErrorNotFound('File not found')
    }

    if (file.uploadedAt) {
      return { success: true, file, alreadyConfirmed: true }
    }

    const adaptor = createStorageAdaptor(storageConfig)
    const bucketType = file.bucketType || 'public'
    const bucket =
      bucketType === 'private'
        ? storageConfig.privateBucket
        : storageConfig.publicBucket
    const exists = await objectExists(adaptor, bucket, file.filePath)

    if (!exists) {
      throw new ServerErrorBadRequest(
        'File upload not found in storage. Please retry upload.',
      )
    }

    const uploadedAt = new Date()
    await repoFile.updateOne(
      { _id: fileId },
      { $set: { uploadedAt, updatedAt: uploadedAt } },
      { context },
    )

    file.uploadedAt = uploadedAt
    file.updatedAt = uploadedAt

    if (file.surveyId) {
      try {
        await FileReference.addFileReference(
          repoFile,
          fileId,
          'survey',
          file.surveyId,
          context,
        )
      } catch (error) {
        if (this.logger) {
          this.logger.warn(
            `Failed to add survey reference for file ${fileId}: ${error.message}`,
          )
        }
      }
    }

    return { success: true, file, alreadyConfirmed: false }
  }
}

export default ServiceFileUpload
