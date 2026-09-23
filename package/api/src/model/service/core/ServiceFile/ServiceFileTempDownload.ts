import { createHash } from 'crypto'
import { randomBytes } from 'crypto'
import { Readable, Transform } from 'stream'

import { Service, ServerErrorInternal } from 'mzen-server'
import { File } from 'veysur-common'
import MzenId from 'mzen-id'

import { RepoFile } from 'model'
import { AclContext } from 'model/entity/AclContext'
import {
  createStorageAdaptor,
  generateStoredFilename,
  generateFilePath,
  generateSignedDownloadUrl,
  contextForProject,
} from 'common'

import { StorageConfig, getStorageConfig } from './FileS3Config'

export interface TempDownloadResult {
  fileId: string
  downloadUrl: string
  filename: string
  expiresAt: Date
}

export class ServiceFileTempDownload extends Service {
  constructor() {
    super({ name: 'fileTempDownload' })
  }

  private getStorageConfig(): StorageConfig {
    return getStorageConfig(this.config)
  }

  /**
   * Create a temporary downloadable file from a stream.
   *
   * Streams directly to S3 — no disk writes. Hash and size are computed
   * inline via a PassThrough tap as the data uploads.
   */
  async createTempDownloadFromStream({
    projectId,
    filename,
    stream,
    mimeType,
    aclContext,
    entityId,
    entityType,
    requestHost,
    requestProto,
    expirationHours = 6,
  }: {
    projectId: string
    filename: string
    stream: Readable
    mimeType: string
    aclContext: AclContext
    entityId?: string
    entityType?: string
    requestHost?: string
    requestProto?: string
    expirationHours?: number
  }): Promise<TempDownloadResult> {
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
    const adaptor = createStorageAdaptor(effectiveConfig)
    const dsContext = contextForProject(projectId)

    // Compute hash + size inline as the stream uploads — no disk write.
    //
    // Use a Transform (not PassThrough + tap listener) so that the readable
    // side is NOT in flowing mode before putObject starts reading. A tap
    // listener on PassThrough would put the stream into flowing mode
    // immediately, causing the local adapter's `await mkdir()` (which runs
    // before streamToBuffer inside putObject) to drain the first chunks
    // before streamToBuffer registers its listener — dropping the gzip header.
    const hash = createHash('sha256')
    let size = 0
    const tap = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        hash.update(chunk)
        size += chunk.length
        cb(null, chunk)
      },
    })
    stream.pipe(tap)

    const fileId = MzenId()
    const storedFilename = generateStoredFilename(
      filename,
      randomBytes(8).toString('hex'),
    )
    const filePath = generateFilePath(projectId, storedFilename, {
      fileContext: 'temp',
    })

    try {
      await adaptor.putObject({
        Bucket: storageConfig.privateBucket,
        Key: filePath,
        Body: tap,
        ContentType: mimeType,
      })
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error)
      throw new ServerErrorInternal({
        message: `Failed to write temporary download file to storage: ${cause}`,
        bucket: storageConfig.privateBucket,
        key: filePath,
      })
    }

    const fileHash = hash.digest('hex')
    const now = new Date()
    const deletionTime = new Date(
      now.getTime() + expirationHours * 60 * 60 * 1000,
    )

    const file = new File({
      _id: fileId,
      filename,
      storedFilename,
      hash: fileHash,
      size,
      mimeType,
      filePath,
      uploadedAt: now,
      createdById: userId,
      surveyId: entityType === 'survey' ? entityId : null,
      fileContext: 'temp',
      bucketType: 'private',
      createdAt: now,
      updatedAt: now,
      deletedAt: deletionTime,
      refs: null,
    })

    await repoFile.create(file, { context: dsContext })

    const expiresInSeconds = Math.floor(
      (deletionTime.getTime() - now.getTime()) / 1000,
    )
    const downloadUrl = await generateSignedDownloadUrl(
      effectiveConfig,
      adaptor,
      effectiveConfig.privateBucket,
      filePath,
      {
        expiresIn: expiresInSeconds,
        filename,
      },
    )

    return {
      fileId: file._id,
      downloadUrl,
      filename,
      expiresAt: deletionTime,
    }
  }
}

export default ServiceFileTempDownload
