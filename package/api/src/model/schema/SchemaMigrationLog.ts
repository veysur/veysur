import { Schema, SchemaBuilder as sb } from '@datacapy/schema'

/** Detail of one patch's execution, embedded in a migration log entry. */
export interface MigrationLogPatchResult {
  version: string
  description: string
  status: 'success' | 'failed' | 'skipped'
  duration: number
  error: string | null
}

export class SchemaMigrationLog extends Schema.from(
  sb
    .schema('migrationLog')
    .construct('MigrationLogEntry')
    .strict()
    .shape({
      _id: sb.string().required().init(''),
      runId: sb.string().required().maxLength(255).init(''),
      dataSourceName: sb
        .string()
        .required()
        .inArray(['account', 'project'])
        .as<'account' | 'project'>()
        .init('' as 'account' | 'project'),
      contextKey: sb.string().required().maxLength(255).init(''),
      status: sb
        .string()
        .required()
        .inArray(['pending', 'running', 'success', 'failed'])
        .default('pending'),
      attempts: sb.number().default(0),
      previousVersion: sb.string().default(null),
      currentVersion: sb.string().default(null),
      totalPatches: sb.number().default(0),
      successCount: sb.number().default(0),
      failedCount: sb.number().default(0),
      skippedCount: sb.number().default(0),
      patchResults: sb.array().as<MigrationLogPatchResult>().default([]),
      duration: sb.number().default(null),
      startedAt: sb.date().default(null),
      finishedAt: sb.date().default(null),
      error: sb.string().maxLength(10000).default(null),
      createdAt: sb
        .date()
        .required()
        .init(() => new Date()),
    }),
) {}

export default SchemaMigrationLog
