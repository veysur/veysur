// cspell:ignore sargable
import { DataTransferJob } from 'veysur-common'
import { Repo, TYPE_HINT_TIMESTAMP } from 'mzen-server'

/**
 * Default (account) datasource, not project-scoped: processQueue() needs to
 * find due jobs across every project in one query, the same reason RepoEmail
 * (polled the same way for the mail queue) isn't project-scoped either. Each
 * row's own `projectId` field is what the worker uses to reach the right
 * project datasource when it actually processes the job.
 */
export class RepoDataTransferJob extends Repo<DataTransferJob> {
  constructor() {
    super({
      name: 'dataTransferJob',
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        status: {
          spec: { status: 1, createdAt: 1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        // Backs findByRequester() - listJobs() (the notification bell,
        // polled every 15s while a job is active) filters on this pair then
        // sorts by createdAt.
        requester: {
          spec: { projectId: 1, requestedByUserId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        // Backs findActiveMatch() - enqueueExport()'s dedup lookup. `status`
        // is deliberately excluded: it's a 4-value enum queried with `$in`
        // (not sargable as a composite-index tail column anyway), and
        // including it alongside `entityType`/`format` as default-sized
        // generated VARCHAR(255) columns pushes the composite key over
        // MySQL's 3072-byte limit. find() still filters on it post-scan.
        activeMatch: {
          spec: {
            projectId: 1,
            requestedByUserId: 1,
            entityType: 1,
            entityId: 1,
            format: 1,
          },
        },
        // Backs findActiveImportMatch() - the import equivalent of
        // activeMatch. Imports have no entityId to key on (an import
        // creates a new entity rather than referencing an existing one),
        // so this keys on the uploaded file's content hash instead, which
        // is by far the most selective field here. `format`/`status` are
        // deliberately excluded for the same key-length reason as
        // activeMatch above - four non-id VARCHAR(255) generated columns
        // would exceed MySQL's 3072-byte composite key limit. find() still
        // filters on both post-scan.
        activeImportMatch: {
          spec: {
            projectId: 1,
            requestedByUserId: 1,
            entityType: 1,
            sourceFileHash: 1,
          },
        },
      },
    })
  }

  async findDuePending(limit: number): Promise<DataTransferJob[]> {
    return this.find({ status: 'pending' }, { sort: { createdAt: 1 }, limit })
  }

  /**
   * Jobs wedged in 'pending' (queue processor never ran) or 'processing'
   * (API crashed mid-processOne) for longer than the configured staleness
   * threshold - see ServiceDataTransferJob.reapStale().
   */
  async findStale(cutoffDate: Date): Promise<DataTransferJob[]> {
    return this.find({
      $or: [
        { status: 'pending', createdAt: { $lte: cutoffDate } },
        { status: 'processing', startedAt: { $lte: cutoffDate } },
      ],
    })
  }

  async findByRequester({
    projectId,
    requestedByUserId,
    limit,
    offset,
  }: {
    projectId: string
    requestedByUserId: string
    limit: number
    offset: number
  }): Promise<DataTransferJob[]> {
    return this.find(
      { projectId, requestedByUserId },
      { sort: { createdAt: -1 }, limit, offset },
    )
  }

  /**
   * Candidate jobs for enqueueExport()'s dedup check - still-active jobs for
   * the same entity/format. Small enough (usually 0 or 1) that the caller
   * compares `options` in JS rather than pushing it into this query.
   */
  async findActiveMatch({
    projectId,
    requestedByUserId,
    entityType,
    entityId,
    format,
  }: {
    projectId: string
    requestedByUserId: string
    entityType: string
    entityId: string
    format: string
  }): Promise<DataTransferJob[]> {
    return this.find({
      projectId,
      requestedByUserId,
      entityType,
      entityId,
      format,
      status: { $in: ['pending', 'processing'] },
    })
  }

  /**
   * Candidate jobs for enqueueImport()'s/generateImportUrl()'s dedup
   * check - still-active import jobs for the same uploaded file content.
   * The caller further filters by `options` equality in JS, as
   * findActiveMatch()'s callers already do for export.
   */
  async findActiveImportMatch({
    projectId,
    requestedByUserId,
    entityType,
    format,
    sourceFileHash,
  }: {
    projectId: string
    requestedByUserId: string
    entityType: string
    format: string
    sourceFileHash: string
  }): Promise<DataTransferJob[]> {
    return this.find({
      projectId,
      requestedByUserId,
      entityType,
      format,
      sourceFileHash,
      status: { $in: ['pending', 'processing'] },
    })
  }

}

export default RepoDataTransferJob
