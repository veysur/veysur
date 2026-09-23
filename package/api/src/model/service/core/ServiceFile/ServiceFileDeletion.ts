import {
  Service,
  ServerErrorNotFound,
  ServerErrorBadRequest,
} from 'mzen-server'
import { DEFAULT_PROJECT_ID, File } from 'veysur-common'
import momentTimezone from 'moment-timezone'

import { RepoFile, RepoSurvey } from 'model'
import { createStorageAdaptor, contextForProject } from 'common'
import { isSelfHosted } from 'config/edition'
import { IMAGE_SET_ID_PATTERN } from './constants'

import { StorageConfig, getStorageConfig } from './FileS3Config'
import { FileReference } from './FileReference'

export interface SoftDeleteResult {
  success: boolean
  file: File
  alreadyDeleted?: boolean
  softDeleted?: boolean
}

export interface BulkDeleteResult {
  success: boolean
  deletedFiles: number
  softDeleted: boolean
  deletedAt: Date
}

export interface HardDeleteResult {
  success: boolean
  deletedCount: number
  s3DeletedCount: number
  dbDeletedCount: number
  cutoffDate: Date
  s3Errors?: Array<{ fileId: string; error: string }>
}

export class ServiceFileDeletion extends Service {
  constructor() {
    super({ name: 'fileDeletion' })
  }

  /**
   * Called after a project's stored files change (a deletion completes), so a
   * subclass can react (e.g. invalidate a usage cache). No-op in core. Extension seam.
   */
  protected async onProjectStorageChanged(_projectId: string): Promise<void> {}

  private getStorageConfig(): StorageConfig {
    return getStorageConfig(this.config)
  }

  /**
   * Soft delete file (mark as deleted without removing from storage)
   */
  async delete({
    fileId,
    projectId,
  }: {
    fileId: string
    projectId: string
  }): Promise<SoftDeleteResult> {
    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')
    const repoSurvey = this.getRepo<RepoSurvey>('survey')

    const file = await repoFile.findOne({ _id: fileId }, { context })
    if (!file) {
      throw new ServerErrorNotFound('File not found')
    }

    if (file.deletedAt) {
      return { success: true, file, alreadyDeleted: true }
    }

    await FileReference.removeStaleReferences(
      repoFile,
      repoSurvey,
      file,
      context,
    )

    const updatedFile = await repoFile.findOne({ _id: fileId }, { context })
    if (updatedFile) {
      file.refs = updatedFile.refs
    }

    if (file.refs && file.refs.length > 0) {
      throw new ServerErrorBadRequest({
        message: 'Cannot delete file - it is referenced by other entities',
        details: {
          fileId,
          referenceCount: file.refs.length,
          references: file.refs,
        },
      })
    }

    const deletedAt = new Date()
    await repoFile.updateOne(
      { _id: fileId },
      { $set: { deletedAt: deletedAt, updatedAt: deletedAt } },
      { context },
    )

    // Cascade-delete sibling image set variants (original + thumb)
    if (file.imageSetId) {
      await repoFile.updateMany(
        {
          imageSetId: file.imageSetId,
          _id: { $ne: fileId },
          deletedAt: null,
        },
        { $set: { deletedAt: deletedAt, updatedAt: deletedAt } },
        { context },
      )
    }

    await this.onProjectStorageChanged(projectId)

    return {
      success: true,
      file: new File({ ...file, deletedAt: deletedAt }),
      softDeleted: true,
    }
  }

  /**
   * Soft-delete all file records for an image set (3 variants: edited, original, thumb)
   * S3 hard-delete is handled by the background cleanup job after 1 month
   */
  async deleteImageSet({
    projectId,
    imageSetId,
  }: {
    projectId: string
    imageSetId: string
    surveyId?: string
    responseId?: string
    fileContext?: 'project' | 'survey' | 'response' | 'temp' | 'import'
  }): Promise<{ success: boolean; deletedCount: number }> {
    if (!IMAGE_SET_ID_PATTERN.test(imageSetId)) {
      throw new ServerErrorBadRequest('Invalid imageSetId format')
    }

    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')

    const deletedCount = await repoFile.count(
      { imageSetId, deletedAt: null },
      { context },
    )

    if (deletedCount > 0) {
      const deletedAt = new Date()
      await repoFile.updateMany(
        { imageSetId, deletedAt: null },
        { $set: { deletedAt: deletedAt, updatedAt: deletedAt } },
        { context },
      )
    }

    if (deletedCount > 0) {
      await this.onProjectStorageChanged(projectId)
    }

    return { success: true, deletedCount }
  }

  /**
   * Soft delete all files for a survey
   */
  async bulkDeleteForSurvey({
    surveyId,
    projectId,
  }: {
    surveyId: string
    projectId: string
  }): Promise<BulkDeleteResult> {
    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')

    const fileCount = await repoFile.count(
      { surveyId, fileContext: 'survey', deletedAt: null },
      { context },
    )

    const deletedAt = new Date()
    await repoFile.updateMany(
      { surveyId, fileContext: 'survey', deletedAt: null },
      { $set: { deletedAt: deletedAt, updatedAt: deletedAt } },
      { context },
    )

    await this.onProjectStorageChanged(projectId)

    return {
      success: true,
      deletedFiles: fileCount,
      softDeleted: true,
      deletedAt,
    }
  }

  /**
   * Soft delete all files for a response
   */
  async bulkDeleteForResponse({
    surveyId,
    responseId,
    projectId,
  }: {
    surveyId: string
    responseId: string
    projectId: string
  }): Promise<BulkDeleteResult> {
    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')

    const fileCount = await repoFile.count(
      { surveyId, responseId, fileContext: 'response', deletedAt: null },
      { context },
    )

    const deletedAt = new Date()
    await repoFile.updateMany(
      { surveyId, responseId, fileContext: 'response', deletedAt: null },
      { $set: { deletedAt: deletedAt, updatedAt: deletedAt } },
      { context },
    )

    await this.onProjectStorageChanged(projectId)

    return {
      success: true,
      deletedFiles: fileCount,
      softDeleted: true,
      deletedAt,
    }
  }

  /**
   * Hard delete files from storage and database
   * Deletes files with deleted timestamp older than specified date
   */
  async hardDelete({
    projectId,
    olderThan,
    fileContext,
  }: {
    projectId: string
    olderThan?: string
    fileContext?: InstanceType<typeof File>['fileContext']
  }): Promise<HardDeleteResult> {
    const context = contextForProject(projectId)
    const repoFile = this.getRepo<RepoFile>('file')
    const storageConfig = this.getStorageConfig()

    let cutoffDate: Date
    if (olderThan) {
      const duration = momentTimezone.duration(olderThan)
      if (duration.asMilliseconds() !== 0) {
        cutoffDate = momentTimezone().subtract(duration).toDate()
      } else {
        const parsed = momentTimezone(olderThan)
        if (!parsed.isValid()) {
          throw new ServerErrorBadRequest(
            `Invalid olderThan parameter: ${olderThan}. Use format ASP.net style or ISO 8601 time duration.`,
          )
        }
        cutoffDate = parsed.toDate()
      }
    } else {
      cutoffDate = momentTimezone().subtract(1, 'month').toDate()
    }

    const query: Record<string, unknown> = {
      deletedAt: { $ne: null, $lte: cutoffDate },
    }

    if (fileContext !== undefined) {
      query.fileContext = fileContext
    }

    const totalCount = await repoFile.count(query, { context })
    const adaptor = createStorageAdaptor(storageConfig)

    if (totalCount === 0) {
      await adaptor.pruneEmptyDirs(
        storageConfig.publicBucket,
        `project-${projectId}`,
      )
      await adaptor.pruneEmptyDirs(
        storageConfig.privateBucket,
        `project-${projectId}`,
      )
      return {
        success: true,
        deletedCount: 0,
        s3DeletedCount: 0,
        dbDeletedCount: 0,
        cutoffDate,
      }
    }

    const batchSize = 500
    let totalDeleted = 0
    let s3DeletedCount = 0
    let dbDeletedCount = 0
    const s3Errors: Array<{ fileId: string; error: string }> = []

    while (true) {
      const filesToDelete = await repoFile.find(query, {
        context,
        limit: batchSize,
        sort: { deletedAt: 1 },
      })

      if (filesToDelete.length === 0) break

      for (const file of filesToDelete) {
        try {
          const bucketType = file.bucketType || 'public'
          const bucket =
            bucketType === 'private'
              ? storageConfig.privateBucket
              : storageConfig.publicBucket
          await adaptor.deleteObject({ Bucket: bucket, Key: file.filePath })
          s3DeletedCount++
        } catch (error) {
          s3Errors.push({ fileId: file._id, error: error.message })
        }
      }

      const fileIds = filesToDelete.map((f) => f._id)
      await repoFile.deleteMany({ _id: { $in: fileIds } }, { context })
      dbDeletedCount += filesToDelete.length
      totalDeleted += filesToDelete.length

      if (filesToDelete.length < batchSize) break
    }

    await adaptor.pruneEmptyDirs(
      storageConfig.publicBucket,
      `project-${projectId}`,
    )
    await adaptor.pruneEmptyDirs(
      storageConfig.privateBucket,
      `project-${projectId}`,
    )

    return {
      success: true,
      deletedCount: totalDeleted,
      s3DeletedCount,
      dbDeletedCount,
      cutoffDate,
      s3Errors: s3Errors.length > 0 ? s3Errors : undefined,
    }
  }

  /**
   * Hard delete old files across all projects
   * Called daily by task manager to purge files soft-deleted
   */
  async hardDeleteAll(
    options: {
      olderThan?: string
      fileContext?: InstanceType<typeof File>['fileContext']
      _executionId?: string
    } = {},
  ): Promise<{
    success: boolean
    totalDeletedCount: number
    totalStorageErrors: number
    projectsProcessed: number
    projectsFailed: number
  }> {
    const { olderThan = 'PT1H', fileContext } = options
    // Self-hosted has no `project` repo at all (single, config-sourced project — see
    // `model/service/ServiceProject.ts`); iterate its one fixed project id instead.
    const projects = isSelfHosted()
      ? [{ _id: DEFAULT_PROJECT_ID }]
      : ((await this.getRepo('project').find({})) as { _id: string }[])

    let totalDeletedCount = 0
    let totalStorageErrors = 0
    let projectsFailed = 0

    for (const project of projects) {
      try {
        const result = await this.hardDelete({
          projectId: project._id,
          olderThan,
          fileContext,
        })
        totalDeletedCount += result.deletedCount
        if (result.s3Errors?.length) {
          totalStorageErrors += result.s3Errors.length
          for (const err of result.s3Errors) {
            this.logger.log(
              `[ServiceFileDeletion] hardDeleteAll storage error for project ${project._id} file ${err.fileId}: ${err.error}`,
            )
          }
        }
      } catch (error) {
        projectsFailed++
        this.logger.log(
          `[ServiceFileDeletion] hardDeleteAll failed for project ${project._id}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    this.logger.log(
      `[ServiceFileDeletion] hardDeleteAll complete: ${totalDeletedCount} files deleted across ${projects.length} projects` +
        (totalStorageErrors > 0
          ? ` (${totalStorageErrors} storage errors, DB records still removed)`
          : '') +
        (projectsFailed > 0 ? ` (${projectsFailed} projects failed)` : ''),
    )

    return {
      success: true,
      totalDeletedCount,
      totalStorageErrors,
      projectsProcessed: projects.length,
      projectsFailed,
    }
  }
}

export default ServiceFileDeletion
