import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaDataTransferJob } from './DataTransferJob.schema'

type InternalId = string & t.MaxLength<17>

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
 *
 * @schema dataTransferJob construct=DataTransferJob strict
 */
export interface DataTransferJobData {
  _id: InternalId & t.Required & t.InitFn<'genUniqueId'>
  direction: ('import' | 'export') & t.Required & t.Default<'export'>
  entityType: string & t.Required & t.Init<''> & t.MaxLength<64>
  entityId: (InternalId & t.Default<null>) | null
  label: (string & t.Default<null> & t.MaxLength<255>) | null
  format: string & t.Required & t.Init<''> & t.MaxLength<16>
  options: (Record<string, unknown> & t.NonStrict & t.Default<t.EmptyObject>) | null
  sourceFileId: (InternalId & t.Default<null>) | null
  /**
   * The uploaded import file's content hash, used to dedup a resubmission
   * of the same file while a prior job for it is still active. Unused for
   * export jobs.
   */
  sourceFileHash: (string & t.Default<null> & t.MaxLength<64>) | null
  projectId: InternalId & t.Required & t.Init<''>
  requestedByUserId: InternalId & t.Required & t.Init<''>
  requestHost: (string & t.Default<null> & t.MaxLength<255>) | null
  requestProto: (string & t.Default<null> & t.MaxLength<16>) | null
  status: ('pending' | 'processing' | 'completed' | 'failed') &
    t.Required &
    t.Default<'pending'>
  resultFileId: (InternalId & t.Default<null>) | null
  error: (string & t.Default<null>) | null
  createdAt: Date & t.Default<'now'>
  startedAt: (Date & t.Default<null>) | null
  completedAt: (Date & t.Default<null>) | null
  updatedAt: Date & t.Default<'now'>
}

export class DataTransferJob extends SchemaConstructor.from(
  SchemaDataTransferJob,
) {}

export default DataTransferJob
