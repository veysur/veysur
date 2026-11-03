import { SchemaConstructor } from '@datacapy/schema'
import { SchemaDataTransferJob } from '../schema/SchemaDataTransferJob'

/**
 * Fields come from {@link SchemaDataTransferJob}.
 *
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
export class DataTransferJob extends SchemaConstructor.from(
  SchemaDataTransferJob,
) {}

export default DataTransferJob
