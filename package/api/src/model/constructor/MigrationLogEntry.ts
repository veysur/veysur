import { SchemaConstructor } from '@datacapy/schema'

import { SchemaMigrationLog } from '../schema/SchemaMigrationLog'

export type { MigrationLogPatchResult } from '../schema/SchemaMigrationLog'

/**
 * Fields come from {@link SchemaMigrationLog}.
 *
 * Tracks the progress of migrating a single database (account or project)
 * within a batch migration run. Distinct from @datacapy/migrate's own
 * migrationMeta table, which lives inside each target database and is the
 * canonical record of applied patches; this is a run/job ledger spanning
 * multiple databases in one CLI invocation. `contextKey` is 'account' for the
 * static datasource and the projectId for dynamic ones; `duration` is in ms.
 */
export class MigrationLogEntry extends SchemaConstructor.from(
  SchemaMigrationLog,
) {}

export default MigrationLogEntry
