import { createHash } from 'crypto'
import { PassThrough, Readable } from 'stream'
import {
  Service,
  ServerErrorBadRequest,
  ServerErrorNotFound,
} from 'mzen-server'
import MzenId from 'mzen-id'
import { File } from 'veysur-common'

import { RepoFile, RepoSurvey } from 'model'
import { AclConditions, AclContext } from 'model/entity/AclContext'
import {
  createStorageAdaptor,
  generateSignedUploadUrl,
  generateFilePath,
  contextForProject,
  getObjectSize,
} from 'common'

import { EntityHandlerRegistry } from './ImportExport/EntityHandlerRegistry'
import { FormatRegistry } from './ImportExport/format/FormatRegistry'
import { VsstFormatHandler } from './ImportExport/format/VsstFormatHandler'
import { JsonFormatHandler } from './ImportExport/format/JsonFormatHandler'
import { MarkdownFormatHandler } from './ImportExport/format/MarkdownFormatHandler'
import { VsspFormatHandler } from './ImportExport/format/VsspFormatHandler'
import { VssaFormatHandler } from './ImportExport/format/VssaFormatHandler'
import { CsvFormatHandler } from './ImportExport/format/CsvFormatHandler'
import { SurveyEntityHandler } from './ImportExport/handlers/SurveyEntityHandler'
import { SurveyResponseEntityHandler } from './ImportExport/handlers/SurveyResponseEntityHandler'
import { SurveyPublicationEntityHandler } from './ImportExport/handlers/SurveyPublicationEntityHandler'
import { SurveyFullEntityHandler } from './ImportExport/handlers/SurveyFullEntityHandler'
import { ExportOptions } from './ImportExport/EntityHandlerInterface'
import { getStorageConfig } from './ServiceFile/FileS3Config'
import { ServiceFileTempDownload } from './ServiceFile/ServiceFileTempDownload'
import { ServiceDataTransferJob } from './ServiceDataTransferJob'
import { ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES } from './ImportExport/handlers/util/asyncTransferSizeThreshold'

interface ImportResult {
  success: boolean
  entityId: string
  entityType: string
  hasIdTranslations: boolean
  repairs?: unknown[]
  discards?: unknown[]
  warnings?: unknown[]
}

/**
 * Generic import/export service
 *
 * Supports two-step import via storage adaptor:
 * 1. generateImportUrl() - Create File record + signed upload URL
 * 2. Client uploads to API upload endpoint
 * 3. processImport() - Download from storage, parse, validate, persist
 */
export class ServiceImportExport extends Service {
  private entityHandlerRegistry: EntityHandlerRegistry
  private formatRegistry: FormatRegistry

  constructor() {
    super({ name: 'importExport' })
    this.formatRegistry = new FormatRegistry()
    this.entityHandlerRegistry = new EntityHandlerRegistry()
  }

  async init() {
    const storageConfig = this.getStorageConfig()

    this.formatRegistry.register(new VsstFormatHandler(storageConfig))
    this.formatRegistry.register(new JsonFormatHandler())
    this.formatRegistry.register(new MarkdownFormatHandler())
    this.formatRegistry.register(new VsspFormatHandler(storageConfig))
    this.formatRegistry.register(new VssaFormatHandler(storageConfig))
    this.formatRegistry.register(new CsvFormatHandler())

    const surveyHandler = new SurveyEntityHandler(
      this.getRepo('survey'),
      this.getRepo('surveyLanguage'),
      this.getRepo('file'),
      this.getStorageConfig(),
      this.getRepo('surveyParticipantAttribute'),
      this.getRepo('surveyParticipantAttributeLanguage'),
      this.getRepo('emailTemplate'),
    )
    this.entityHandlerRegistry.register(surveyHandler)

    const surveyResponseHandler = new SurveyResponseEntityHandler(
      this.getRepo('surveyResponse'),
      this.getRepo('surveyParticipant'),
      this.getRepo('surveySnapshot'),
      this.getRepo('surveyLanguageSnapshot'),
      this.getRepo('file'),
    )
    this.entityHandlerRegistry.register(surveyResponseHandler)

    const surveyPublicationHandler = new SurveyPublicationEntityHandler(
      this.getRepo('surveyResponse'),
      this.getRepo('surveyPublication'),
      this.getRepo('surveySnapshot'),
      this.getRepo('surveySnapshotPartial'),
      this.getRepo('survey'),
      this.getRepo('surveyParticipant'),
      this.getRepo('surveyElement'),
      this.getRepo('surveySection'),
      this.getRepo('surveyLanguageSnapshot'),
      this.getRepo('file'),
      this.getStorageConfig(),
      this.getRepo('surveyParticipantAttributeSnapshot'),
      this.getRepo('surveyParticipantAttributeLanguageSnapshot'),
    )
    this.entityHandlerRegistry.register(surveyPublicationHandler)

    const surveyFullHandler = new SurveyFullEntityHandler(
      this.getRepo('survey'),
      this.getRepo('surveyResponse'),
      this.getRepo('surveyPublication'),
      this.getRepo('surveySnapshot'),
      this.getRepo('surveySnapshotPartial'),
      this.getRepo('surveyParticipant'),
      this.getRepo('surveyElement'),
      this.getRepo('surveySection'),
      this.getRepo('surveyLanguage'),
      this.getRepo('surveyLanguageSnapshot'),
      this.getRepo('file'),
      this.getStorageConfig(),
      this.getRepo('surveyParticipantAttribute'),
      this.getRepo('surveyParticipantAttributeLanguage'),
      this.getRepo('surveyParticipantAttributeSnapshot'),
      this.getRepo('surveyParticipantAttributeLanguageSnapshot'),
      this.getRepo('emailTemplate'),
    )
    this.entityHandlerRegistry.register(surveyFullHandler)
  }

  private getStorageConfig() {
    return getStorageConfig(this.config)
  }

  /**
   * Wrap a readable stream with inline SHA-256 hash and byte counting.
   * Resolves getHash()/getSize() only after the stream is fully consumed.
   */
  private createHashingStream(source: NodeJS.ReadableStream): {
    stream: NodeJS.ReadableStream
    getHash: () => string
    getSize: () => number
  } {
    const hash = createHash('sha256')
    let size = 0
    const pass = new PassThrough()

    pass.on('data', (chunk: Buffer) => {
      hash.update(chunk)
      size += chunk.length
    })
    source.pipe(pass)

    return {
      stream: pass,
      getHash: () => hash.digest('hex'),
      getSize: () => size,
    }
  }

  /**
   * Export entity in specified format. When the handler's estimated export
   * size (see EntityHandlerInterface.estimateExportSize) exceeds
   * ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES, enqueue a job and return
   * immediately instead of compiling inline; the caller polls
   * ServiceDataTransferJob.getStatus() for the result. Otherwise compile
   * and return the download URL synchronously, as before.
   */
  async export(params: {
    entityType: string
    entityId: string
    format: string
    options?: ExportOptions
    projectId: string
    aclConditions: AclConditions
    aclContext: AclContext
    requestHost?: string
    requestProto?: string
  }) {
    const {
      entityType,
      format,
      projectId,
      aclContext,
      requestHost,
      requestProto,
    } = params
    const handler = this.entityHandlerRegistry.get(entityType)

    if (!handler.getSupportedFormats().includes(format)) {
      throw new ServerErrorBadRequest({
        message: `Format '${format}' not supported for entity type '${entityType}'`,
        supportedFormats: handler.getSupportedFormats(),
      })
    }

    const estimatedSize =
      (await handler.estimateExportSize?.(
        params.entityId,
        { projectId, aclConditions: params.aclConditions, aclContext },
        params.options,
      )) ?? 0

    if (estimatedSize > ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES) {
      const repoSurvey = this.getRepo<RepoSurvey>('survey')
      const survey = await repoSurvey.findOne(
        { _id: params.entityId },
        { context: contextForProject(projectId) },
      )
      const label = survey ? `${survey.name} (.${format})` : null

      const serviceDataTransferJob =
        this.getService<ServiceDataTransferJob>('dataTransferJob')
      const { jobId, status, alreadyQueued } =
        await serviceDataTransferJob.enqueueExport({
          entityType,
          entityId: params.entityId,
          format,
          options: params.options,
          projectId,
          requestedByUserId: aclContext.jwt?._id ?? '',
          requestHost,
          requestProto,
          label,
        })
      return { async: true as const, jobId, status, alreadyQueued }
    }

    return this.compileExport(params)
  }

  /**
   * The synchronous compile-and-upload path shared by export()'s
   * non-async-eligible branch and ServiceDataTransferJob.processQueue()
   * (which calls this directly, never export(), to avoid re-triggering
   * the async-eligibility branch and enqueueing itself forever).
   */
  async compileExport({
    entityType,
    entityId,
    format,
    options,
    projectId,
    aclConditions,
    aclContext,
    requestHost,
    requestProto,
  }: {
    entityType: string
    entityId: string
    format: string
    options?: ExportOptions
    projectId: string
    aclConditions: AclConditions
    aclContext: AclContext
    requestHost?: string
    requestProto?: string
  }) {
    const handler = this.entityHandlerRegistry.get(entityType)
    const entity = await handler.fetchForExport(
      entityId,
      { projectId, aclConditions, aclContext },
      options,
    )

    const formatHandler = this.formatRegistry.getByFormat(format)
    const stream = await handler.prepareExportData(
      entity,
      formatHandler,
      options,
    )

    const serviceFileTempDownload =
      this.getService<ServiceFileTempDownload>('fileTempDownload')
    return serviceFileTempDownload.createTempDownloadFromStream({
      projectId,
      filename: formatHandler.getFilename(entityType, entityId, options),
      stream,
      mimeType: formatHandler.getMimeType(),
      aclContext,
      entityId,
      entityType,
      requestHost,
      requestProto,
      expirationHours: 6,
    })
  }

  /**
   * Generate signed upload URL for import
   */
  async generateImportUrl({
    entityType,
    format,
    options = {},
    fileHash,
    projectId,
    aclContext,
    requestHost,
    requestProto,
  }: {
    entityType: string
    format: string
    options?: Record<string, unknown>
    fileHash?: string
    projectId: string
    aclContext: AclContext
    requestHost?: string
    requestProto?: string
  }) {
    const handler = this.entityHandlerRegistry.get(entityType)

    if (!handler.getSupportedFormats().includes(format)) {
      throw new ServerErrorBadRequest({
        message: `Format '${format}' not supported for entity type '${entityType}'`,
        supportedFormats: handler.getSupportedFormats(),
      })
    }

    // Short-circuit before creating a File record or presigned URL if this
    // exact file content is already queued/processing for this
    // project/user/entityType/format/options - avoids the client wasting
    // bandwidth re-uploading a file whose import is already in flight.
    const existingJob = await this.getService<ServiceDataTransferJob>(
      'dataTransferJob',
    ).findActiveImportJob({
      projectId,
      requestedByUserId: aclContext.jwt._id,
      entityType,
      format,
      sourceFileHash: fileHash,
      options,
    })
    if (existingJob) {
      return {
        alreadyQueued: true as const,
        jobId: existingJob._id,
        status: existingJob.status,
      }
    }

    const formatHandler = this.formatRegistry.getByFormat(format)
    const extension = formatHandler.extensions[0]
    const filename = `import-${entityType}-${Date.now()}${extension}`

    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')
    const fileId = MzenId()
    const storedFilename = filename
    const filePath = generateFilePath(projectId, storedFilename, {
      fileContext: 'import',
    })

    const file = new File({
      _id: fileId,
      filename,
      storedFilename,
      hash: fileHash ?? null,
      size: 0,
      mimeType: formatHandler.getMimeType(),
      filePath,
      createdById: aclContext.jwt._id,
      surveyId: null,
      responseId: null,
      fileContext: 'import',
      bucketType: 'private',
      import: {
        entityType,
        format,
        options,
        status: 'pending',
        result: null,
      },
    })

    await repoFile.create(file, { context })

    const storageConfig = this.getStorageConfig()
    const effectiveConfig =
      requestHost && requestProto
        ? {
            ...storageConfig,
            publicBaseUrl: `${requestProto}://${requestHost}`,
          }
        : storageConfig
    const uploadUrl = await generateSignedUploadUrl(
      effectiveConfig,
      effectiveConfig.privateBucket,
      file.filePath,
      3600,
    )

    const expiresAt = new Date(Date.now() + 3600000)
    await repoFile.updateOne(
      { _id: file._id },
      { $set: { deletedAt: expiresAt } },
      { context },
    )

    return {
      fileId: file._id,
      uploadUrl,
      expiresAt,
    }
  }

  /**
   * Entry point for an uploaded import file. When the uploaded file's size
   * exceeds ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES, mark it 'queued' and
   * enqueue a ServiceDataTransferJob instead of parsing inline; the caller
   * polls getImportStatus() for the result. Otherwise parse and persist
   * synchronously, as before.
   */
  async processImport({
    fileId,
    projectId,
    aclContext,
  }: {
    fileId: string
    projectId: string
    aclContext: AclContext
  }) {
    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')

    const file = await repoFile.findOne(
      {
        _id: fileId,
        fileContext: 'import',
        $or: [{ deletedAt: null }, { deletedAt: { $gt: new Date() } }],
      },
      { context },
    )

    if (!file) {
      throw new ServerErrorNotFound({
        message: 'Import file not found or expired',
        fileId,
      })
    }

    if (
      file.import?.status === 'processing' ||
      file.import?.status === 'queued'
    ) {
      throw new ServerErrorBadRequest({
        message: 'Import is already being processed',
      })
    }
    if (file.import?.status === 'completed') {
      return file.import.result
    }

    const storageConfig = this.getStorageConfig()
    const adaptor = createStorageAdaptor(storageConfig)
    const uploadedSize = await getObjectSize(
      adaptor,
      storageConfig.privateBucket,
      file.filePath,
    )

    if ((uploadedSize ?? 0) > ASYNC_TRANSFER_SIZE_THRESHOLD_BYTES) {
      await repoFile.updateOne(
        { _id: fileId },
        { $set: { 'import.status': 'queued' } },
        { context },
      )
      const serviceDataTransferJob =
        this.getService<ServiceDataTransferJob>('dataTransferJob')
      const { jobId, status, alreadyQueued } =
        await serviceDataTransferJob.enqueueImport({
          fileId,
          entityType: file.import.entityType,
          format: file.import.format,
          options: file.import.options,
          sourceFileHash: file.hash,
          projectId,
          requestedByUserId: aclContext.jwt?._id ?? '',
          label: file.filename,
        })
      return { async: true as const, jobId, status, alreadyQueued }
    }

    return this.runImport({ fileId, projectId, aclContext })
  }

  /**
   * Read an import's current status/result for polling. The generic
   * `GET /file/:fileId` endpoint can't serve this: it filters on
   * `uploadedAt: { $ne: null }`, which isn't set until runImport() has
   * already started downloading the file, so a 'pending'/'queued' import
   * would 404 there.
   */
  async getImportStatus({
    fileId,
    projectId,
  }: {
    fileId: string
    projectId: string
  }) {
    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')
    const file = await repoFile.findOne(
      { _id: fileId, fileContext: 'import' },
      { context },
    )
    if (!file) {
      throw new ServerErrorNotFound({
        message: 'Import file not found',
        fileId,
      })
    }
    return {
      fileId: file._id,
      status: file.import?.status ?? null,
      result: file.import?.result ?? null,
    }
  }

  /**
   * The synchronous download-parse-validate-persist path shared by
   * processImport()'s non-async-eligible branch and
   * ServiceDataTransferJob.processQueue() (which calls this directly,
   * never processImport(), to avoid re-triggering the async-eligibility
   * check and enqueueing itself forever).
   */
  async runImport({
    fileId,
    projectId,
    aclContext,
  }: {
    fileId: string
    projectId: string
    aclContext: AclContext
  }) {
    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')

    const file = await repoFile.findOne(
      { _id: fileId, fileContext: 'import' },
      { context },
    )
    if (!file) {
      throw new ServerErrorNotFound({
        message: 'Import file not found or expired',
        fileId,
      })
    }

    await repoFile.updateOne(
      { _id: fileId },
      { $set: { 'import.status': 'processing' } },
      { context },
    )

    try {
      const storageConfig = this.getStorageConfig()
      const adaptor = createStorageAdaptor(storageConfig)
      const s3Result = await adaptor.getObject({
        Bucket: storageConfig.privateBucket,
        Key: file.filePath,
      })

      const {
        stream: hashedStream,
        getHash,
        getSize,
      } = this.createHashingStream(s3Result.Body as NodeJS.ReadableStream)

      const entityHandler = this.entityHandlerRegistry.get(
        file.import.entityType,
      )
      const formatHandler = this.formatRegistry.getByFormat(file.import.format)

      const parsedData = await entityHandler.parseImportData(
        hashedStream as Readable,
        formatHandler,
        { importFileId: fileId },
      )

      await repoFile.updateOne(
        { _id: fileId },
        {
          $set: {
            hash: getHash(),
            size: getSize(),
            uploadedAt: new Date(),
          },
        },
        { context },
      )

      let importResult: ImportResult
      try {
        const validation = await entityHandler.validateImport(parsedData, {
          projectId,
          aclContext,
          ...file.import.options,
          force: Boolean(file.import.options?.force),
        })

        if (!validation.valid && !file.import.options?.force) {
          throw new ServerErrorBadRequest({
            message: 'Import validation failed',
            errors: validation.errors,
            hint: 'Use force=true to attempt automatic repair',
          })
        }

        const importData = validation.data || parsedData
        const result = await entityHandler.persistImport(importData, {
          projectId,
          aclContext,
          translations: validation.repairs,
        })

        const combinedWarnings = [
          ...(validation.warnings ?? []),
          ...(result.warnings ?? []),
        ]

        importResult = {
          success: true,
          entityId: result.entityId,
          entityType: file.import.entityType,
          hasIdTranslations:
            result.hasIdTranslations || validation.hasIdTranslations || false,
          repairs: validation.repairs,
          discards: validation.discards,
          warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined,
        }
      } finally {
        const cleanup = (parsedData as { cleanup?: () => Promise<void> })
          ?.cleanup
        if (typeof cleanup === 'function') {
          await cleanup()
        }
      }

      await repoFile.updateOne(
        { _id: fileId },
        {
          $set: {
            'import.status': 'completed',
            'import.result': importResult,
            deletedAt: new Date(),
          },
        },
        { context },
      )

      return importResult
    } catch (error) {
      await repoFile.updateOne(
        { _id: fileId },
        {
          $set: {
            'import.status': 'failed',
            'import.result': { success: false, error: error.message },
            deletedAt: new Date(),
          },
        },
        { context },
      )
      throw error
    }
  }
}

export default ServiceImportExport
