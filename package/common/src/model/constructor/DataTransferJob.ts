import { genUniqueId } from '@datacapy/id'
import { Infer } from '@datacapy/schema'
import { dataTransferJobShape } from '../schema/SchemaDataTransferJob'

/**
 * Cross-project queue-pointer row ServiceDataTransferJob.processQueue() drains
 * to run work off the request, for both directions:
 *
 * - export: compiles via the existing ServiceImportExport.compileExport()
 *   path; entityId/resultFileId are meaningful, sourceFileId is unused.
 * - import: reruns the existing ServiceImportExport.runImport() path against
 *   the already-uploaded File named by sourceFileId; entityId/resultFileId
 *   are unused (detailed status/result stays on File.import.*, the existing
 *   mechanism; this row only exists so the worker can find due imports
 *   across every project's own datasource in one query).
 */
export class DataTransferJob {
  /**
   * The uploaded import file's content hash - used to dedup a resubmission
   * of the same file while a prior job for it is still active. Unused for
   * export jobs.
   */

  constructor(data: Partial<DataTransferJob> = {}) {
    this._id = data._id || genUniqueId()
    this.direction = data.direction || 'export'
    this.entityType = data.entityType || ''
    this.entityId = data.entityId || null
    this.label = data.label || null
    this.format = data.format || ''
    this.options = data.options || {}
    this.sourceFileId = data.sourceFileId || null
    this.sourceFileHash = data.sourceFileHash || null
    this.projectId = data.projectId || ''
    this.requestedByUserId = data.requestedByUserId || ''
    this.requestHost = data.requestHost || null
    this.requestProto = data.requestProto || null
    this.status = data.status || 'pending'
    this.resultFileId = data.resultFileId || null
    this.error = data.error || null
    this.createdAt = data.createdAt || new Date()
    this.startedAt = data.startedAt || null
    this.completedAt = data.completedAt || null
    this.updatedAt = data.updatedAt || new Date()
  }
}

export interface DataTransferJob extends Infer<typeof dataTransferJobShape> {}

export default DataTransferJob
