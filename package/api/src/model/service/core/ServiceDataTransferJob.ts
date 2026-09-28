import { Service, ServerErrorNotFound, ServerErrorBadRequest } from 'mzen-server'
import { DataTransferJob } from 'veysur-common'

import { RepoDataTransferJob, RepoFile } from 'model'
import { AclContext } from 'model/entity/AclContext'
import { resolveDataTransferFileDownload } from 'model/common'
import { parsePaginationParams } from 'common'

import { ExportOptions } from './ImportExport/EntityHandlerInterface'
import { ServiceImportExport } from './ServiceImportExport'
import { ServiceNotification } from './ServiceNotification'
import { StorageConfig, getStorageConfig } from './ServiceFile/FileS3Config'

/**
 * Runs a survey/project export or import off the request. A job row is
 * created synchronously (enqueueExport/enqueueImport) so the caller gets an
 * id (export) or can keep polling the existing File.import.status (import)
 * immediately; processQueue(), invoked every tick by the seeded
 * ServiceTaskManager 'dataTransferJob'/'processQueue' task, concurrency: 1,
 * so (like the mail queue's processQueue, see docs/mail-queue-pacing.md) no
 * RepoTaskLock is needed, then, per job's direction, calls the existing,
 * unmodified ServiceImportExport.compileExport() or .runImport() (the same
 * synchronous paths export()/processImport() themselves use for
 * non-async-eligible formats) and records the result. Never call
 * export()/processImport() here: both re-check async-eligibility and would
 * just enqueue the job again.
 *
 * Import's detailed status/result stays on File.import.* (the existing
 * mechanism, unchanged); this row exists only so the worker can find due
 * imports across every project's own datasource in one query, since File
 * itself is project-scoped and can't be queried across projects.
 *
 * Worker authorization: compileExport()/runImport() are written for a live
 * request and scope queries via the caller's aclContext/aclConditions. The
 * worker has no live request, so it reconstructs a minimal aclContext from
 * the job's own projectId/requestedByUserId rather than storing a
 * credential: a job row only exists because an authorized (projectAdmin)
 * request created it, so that authorization doesn't need re-checking at
 * process time.
 *
 * This service only tracks job state - it does not surface anything to the
 * user directly. On completion/failure, processOne() creates a related
 * Notification (via ServiceNotification) that the notification bell/panel
 * actually reads; a settled job's own row is later deleted as a side effect
 * of ServiceNotification.cleanupOld(), not by a cleanup task of its own.
 */
export class ServiceDataTransferJob extends Service {
  constructor() {
    super({ name: 'dataTransferJob' })
  }

  private getRepoDataTransferJob(): RepoDataTransferJob {
    return this.getRepo<RepoDataTransferJob>('dataTransferJob')
  }

  private getStorageConfig(): StorageConfig {
    return getStorageConfig(this.config)
  }

  /**
   * True when two options maps are equivalent regardless of key order.
   * ExportOptions is a flat string/boolean map, so a sorted-key JSON
   * comparison is sufficient - no need for a general deep-equal utility.
   */
  private optionsEqual(
    a?: Record<string, unknown>,
    b?: Record<string, unknown>,
  ): boolean {
    const normalize = (options?: Record<string, unknown>) => {
      const entries = Object.entries(options ?? {}).filter(
        ([, value]) => value !== undefined,
      )
      entries.sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      return JSON.stringify(entries)
    }
    return normalize(a) === normalize(b)
  }

  /**
   * Shared with the related Notification's title: the label the frontend
   * has always shown, now built once server-side instead of duplicated in
   * two places client-side.
   */
  private buildJobLabel(job: DataTransferJob): string {
    if (job.label) return job.label
    const action = job.direction === 'export' ? 'Export' : 'Import'
    return `${action} (.${job.format})`
  }

  async enqueueExport({
    entityType,
    entityId,
    format,
    options,
    projectId,
    requestedByUserId,
    requestHost,
    requestProto,
    label,
  }: {
    entityType: string
    entityId: string
    format: string
    options?: ExportOptions
    projectId: string
    requestedByUserId: string
    requestHost?: string
    requestProto?: string
    label?: string | null
  }): Promise<{
    jobId: string
    status: DataTransferJob['status']
    alreadyQueued?: boolean
  }> {
    const repo = this.getRepoDataTransferJob()

    const candidates = await repo.findActiveMatch({
      projectId,
      requestedByUserId,
      entityType,
      entityId,
      format,
    })
    const existing = candidates.find((candidate) =>
      this.optionsEqual(
        candidate.options as Record<string, unknown>,
        options as Record<string, unknown>,
      ),
    )
    if (existing) {
      return { jobId: existing._id, status: existing.status, alreadyQueued: true }
    }

    const job = new DataTransferJob({
      direction: 'export',
      entityType,
      entityId,
      format,
      options: (options as Record<string, unknown>) ?? {},
      projectId,
      requestedByUserId,
      requestHost: requestHost ?? null,
      requestProto: requestProto ?? null,
      status: 'pending',
      label: label ?? null,
    })
    await repo.insertOne(job)
    await this.getService<ServiceNotification>('notification').create({
      type: 'dataTransferJob',
      projectId,
      recipientUserId: requestedByUserId,
      dataTransferJobId: job._id,
      level: 'info',
      title: this.buildJobLabel(job),
    })
    return { jobId: job._id, status: job.status }
  }

  /**
   * Find a still-active (pending/processing) import job for the same
   * project/user/entityType/format/file content and options, if any.
   * Shared by generateImportUrl() (short-circuits before the client
   * uploads at all) and enqueueImport() (belt-and-suspenders against the
   * same generateImportUrl/enqueue race enqueueExport already tolerates).
   * Returns null immediately when `sourceFileHash` is falsy - a caller
   * that hasn't sent a hash gets no dedup rather than a false match.
   */
  async findActiveImportJob({
    projectId,
    requestedByUserId,
    entityType,
    format,
    sourceFileHash,
    options,
  }: {
    projectId: string
    requestedByUserId: string
    entityType: string
    format: string
    sourceFileHash: string | null | undefined
    options?: Record<string, unknown>
  }): Promise<DataTransferJob | null> {
    if (!sourceFileHash) return null

    const repo = this.getRepoDataTransferJob()
    const candidates = await repo.findActiveImportMatch({
      projectId,
      requestedByUserId,
      entityType,
      format,
      sourceFileHash,
    })
    return (
      candidates.find((candidate) =>
        this.optionsEqual(
          candidate.options as Record<string, unknown>,
          options as Record<string, unknown>,
        ),
      ) ?? null
    )
  }

  /**
   * Enqueue an already-uploaded import File (fileId) for background
   * processing. The caller is responsible for setting the File's own
   * `import.status` to `'queued'` beforehand: see
   * ServiceImportExport.processImport(), the only caller, so a second
   * process request against the same file is rejected before it can enqueue
   * a duplicate job.
   */
  async enqueueImport({
    fileId,
    entityType,
    format,
    options,
    sourceFileHash,
    projectId,
    requestedByUserId,
    label,
  }: {
    fileId: string
    entityType: string
    format: string
    options?: Record<string, unknown>
    sourceFileHash?: string | null
    projectId: string
    requestedByUserId: string
    label?: string | null
  }): Promise<{
    jobId: string
    status: DataTransferJob['status']
    alreadyQueued?: boolean
  }> {
    const existing = await this.findActiveImportJob({
      projectId,
      requestedByUserId,
      entityType,
      format,
      sourceFileHash,
      options,
    })
    if (existing) {
      return { jobId: existing._id, status: existing.status, alreadyQueued: true }
    }

    const repo = this.getRepoDataTransferJob()
    const job = new DataTransferJob({
      direction: 'import',
      sourceFileId: fileId,
      sourceFileHash: sourceFileHash ?? null,
      entityType,
      format,
      options: options ?? {},
      projectId,
      requestedByUserId,
      status: 'pending',
      label: label ?? null,
    })
    await repo.insertOne(job)
    await this.getService<ServiceNotification>('notification').create({
      type: 'dataTransferJob',
      projectId,
      recipientUserId: requestedByUserId,
      dataTransferJobId: job._id,
      level: 'info',
      title: this.buildJobLabel(job),
    })
    return { jobId: job._id, status: job.status }
  }

  /**
   * Shared by getStatus() and listJobs(): once a job is completed, resolve
   * its resultFileId to a fresh signed download URL rather than storing one
   * on the job row, since a URL signed at completion time could expire
   * before the client gets around to polling it. See
   * resolveDataTransferFileDownload() (model/common) for the shared logic
   * with ServiceNotification.list().
   */
  private async resolveCompletedFile({
    job,
    projectId,
  }: {
    job: DataTransferJob
    projectId: string
  }): Promise<{
    downloadUrl?: string
    filename?: string
    expiresAt?: Date
    error?: string
  }> {
    return resolveDataTransferFileDownload(
      {
        status: job.status,
        resultFileId: job.resultFileId,
        projectId,
        requestHost: job.requestHost,
        requestProto: job.requestProto,
      },
      {
        repoFile: this.getRepo<RepoFile>('file'),
        storageConfig: this.getStorageConfig(),
      },
    )
  }

  /**
   * Read a job's status for polling. The ACL layer already restricts the
   * caller to a projectAdmin of `projectId` (the X-Project-Id header, same
   * as every other importExport endpoint) before this runs; the projectId
   * match below is a defensive check against querying a job that belongs to
   * a different project than the one the caller is currently scoped to.
   */
  async getStatus({
    jobId,
    projectId,
  }: {
    jobId: string
    projectId: string
  }): Promise<{
    jobId: string
    status: DataTransferJob['status']
    resultFileId: string | null
    error: string | null
    downloadUrl?: string
    filename?: string
    expiresAt?: Date
  }> {
    const repo = this.getRepoDataTransferJob()
    const job = await repo.findOne({ _id: jobId })
    if (!job || job.projectId !== projectId) {
      throw new ServerErrorNotFound({ message: 'Job not found', jobId })
    }

    const resolved = await this.resolveCompletedFile({ job, projectId })
    return {
      jobId: job._id,
      status: job.status,
      resultFileId: job.resultFileId,
      error: job.error ?? resolved.error ?? null,
      ...(resolved.downloadUrl
        ? {
            downloadUrl: resolved.downloadUrl,
            filename: resolved.filename,
            expiresAt: resolved.expiresAt,
          }
        : {}),
    }
  }

  /**
   * List the calling admin's own recent export/import jobs, most recent
   * first. Scoped to `aclContext.jwt._id` (not every admin's activity on the
   * project). The notification bell/panel now reads ServiceNotification.list()
   * instead of this method directly.
   */
  async listJobs({
    projectId,
    aclContext,
    page,
    perPage,
  }: {
    projectId: string
    aclContext: AclContext
    page?: number
    perPage?: number
  }): Promise<{
    jobs: Array<{
      jobId: string
      direction: DataTransferJob['direction']
      entityType: string
      format: string
      label: string | null
      status: DataTransferJob['status']
      resultFileId: string | null
      error: string | null
      downloadUrl?: string
      filename?: string
      expiresAt?: Date
      createdAt: Date
      completedAt: Date | null
    }>
    jobCount: number
  }> {
    const userId = aclContext.jwt?._id ?? ''
    const pagination = parsePaginationParams(page, perPage, { perPage: 20 })
    const offset = (pagination.page - 1) * pagination.perPage

    const repo = this.getRepoDataTransferJob()
    const query = { projectId, requestedByUserId: userId }
    const [jobCount, jobs] = await Promise.all([
      repo.count(query),
      repo.findByRequester({
        projectId,
        requestedByUserId: userId,
        limit: pagination.perPage,
        offset,
      }),
    ])

    const resolvedJobs = await Promise.all(
      jobs.map(async (job) => {
        const resolved = await this.resolveCompletedFile({ job, projectId })
        return {
          jobId: job._id,
          direction: job.direction,
          entityType: job.entityType,
          format: job.format,
          label: job.label,
          status: job.status,
          resultFileId: job.resultFileId,
          error: job.error ?? resolved.error ?? null,
          ...(resolved.downloadUrl
            ? {
                downloadUrl: resolved.downloadUrl,
                filename: resolved.filename,
                expiresAt: resolved.expiresAt,
              }
            : {}),
          createdAt: job.createdAt,
          completedAt: job.completedAt,
        }
      }),
    )

    return { jobs: resolvedJobs, jobCount }
  }

  /**
   * Delete a single settled (completed/failed) job the calling admin owns.
   * Never touches the job's resultFileId File; that has its own independent
   * expiry/cleanup mechanism (ServiceFileTempDownload). The notification
   * panel's dismiss action now calls ServiceNotification.dismiss() instead,
   * which does not delete this row - see ServiceNotification.cleanupOld().
   */
  async deleteJob({
    jobId,
    projectId,
    aclContext,
  }: {
    jobId: string
    projectId: string
    aclContext: AclContext
  }): Promise<{ success: true }> {
    const repo = this.getRepoDataTransferJob()
    const job = await repo.findOne({ _id: jobId })
    const userId = aclContext.jwt?._id ?? ''
    if (!job || job.projectId !== projectId || job.requestedByUserId !== userId) {
      throw new ServerErrorNotFound({ message: 'Job not found', jobId })
    }
    if (job.status === 'pending' || job.status === 'processing') {
      throw new ServerErrorBadRequest({
        message: 'Cannot delete a job that is still in progress',
        jobId,
        status: job.status,
      })
    }

    await repo.deleteOne({ _id: jobId })
    return { success: true }
  }

  /**
   * Delete a settled (completed/failed) job by id, no ACL check - called
   * only from ServiceNotification.cleanupOld(), a background task, once its
   * related notification has already aged out past retention. A job that's
   * missing or still pending/processing is left alone rather than treated
   * as an error: cleanupOld() only calls this for jobs a settled
   * notification already points to, so either case would be a stale
   * reference, not something this method needs to report on.
   */
  async deleteSettledJob(jobId: string): Promise<void> {
    const repo = this.getRepoDataTransferJob()
    const job = await repo.findOne({ _id: jobId })
    if (!job || job.status === 'pending' || job.status === 'processing') {
      return
    }
    await repo.deleteOne({ _id: jobId })
  }

  /**
   * Invoked on every tick by the seeded 'dataTransfer'/'processQueue' Task
   * (concurrency: 1). Drains due pending jobs sequentially, oldest first.
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    await this.reapStale()

    const repo = this.getRepoDataTransferJob()
    const batchSize = this.config?.model?.app?.dataTransfer?.processBatchSize ?? 10
    const jobs = await repo.findDuePending(batchSize)

    let processed = 0
    let failed = 0

    for (const job of jobs) {
      const ok = await this.processOne(job)
      if (ok) processed += 1
      else failed += 1
    }

    return { processed, failed }
  }

  /**
   * Fails out jobs wedged in 'pending' (queue processor was down, e.g. the
   * dev Docker overlay's disabled task-manager) or 'processing' (API
   * crashed mid-processOne) for longer than dataTransfer.staleAfterMs.
   * Marking them 'failed' (not deleting them) also drops them out of the
   * dedup match set (findActiveMatch/findActiveImportMatch both filter on
   * status pending/processing), so the next attempt creates a fresh job
   * instead of latching onto a dead one.
   */
  private async reapStale(): Promise<void> {
    const repo = this.getRepoDataTransferJob()
    const staleAfterMs =
      this.config?.model?.app?.dataTransfer?.staleAfterMs ?? 15 * 60 * 1000
    const cutoff = new Date(Date.now() - staleAfterMs)
    const staleJobs = await repo.findStale(cutoff)

    for (const job of staleJobs) {
      const message =
        job.status === 'pending'
          ? 'Job timed out waiting to be processed.'
          : 'Job timed out during processing.'
      await repo.updateOne(
        { _id: job._id },
        { $set: { status: 'failed', error: message, completedAt: new Date() } },
      )
      await this.getService<ServiceNotification>(
        'notification',
      ).updateForDataTransferJob({
        dataTransferJobId: job._id,
        level: 'error',
        title: this.buildJobLabel(job),
        message,
      })
    }
  }

  private async processOne(job: DataTransferJob): Promise<boolean> {
    const repo = this.getRepoDataTransferJob()
    await repo.updateOne(
      { _id: job._id },
      { $set: { status: 'processing', startedAt: new Date() } },
    )

    try {
      const serviceImportExport =
        this.getService<ServiceImportExport>('importExport')
      const aclContext: AclContext = {
        jwt: { _id: job.requestedByUserId },
        projectId: job.projectId,
      }

      const resultFileId =
        job.direction === 'export'
          ? (
              await serviceImportExport.compileExport({
                entityType: job.entityType,
                entityId: job.entityId ?? '',
                format: job.format,
                options: job.options as ExportOptions,
                projectId: job.projectId,
                aclConditions: {},
                aclContext,
                requestHost: job.requestHost ?? undefined,
                requestProto: job.requestProto ?? undefined,
              })
            ).fileId
          : await (async () => {
              if (!job.sourceFileId) {
                throw new Error('Import job is missing its sourceFileId')
              }
              await serviceImportExport.runImport({
                fileId: job.sourceFileId,
                projectId: job.projectId,
                aclContext,
              })
              return null
            })()

      await repo.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'completed',
            resultFileId,
            completedAt: new Date(),
          },
        },
      )
      await this.getService<ServiceNotification>(
        'notification',
      ).updateForDataTransferJob({
        dataTransferJobId: job._id,
        level: 'success',
        title: this.buildJobLabel(job),
        message:
          job.direction === 'import' ? 'Import complete.' : 'Ready to download.',
      })
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await repo.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'failed',
            error: errorMessage,
            completedAt: new Date(),
          },
        },
      )
      await this.getService<ServiceNotification>(
        'notification',
      ).updateForDataTransferJob({
        dataTransferJobId: job._id,
        level: 'error',
        title: this.buildJobLabel(job),
        message: errorMessage,
      })
      return false
    }
  }
}

export default ServiceDataTransferJob
