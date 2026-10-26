import { Schema, sb } from '@datacapy/schema'

export class SchemaMigrationLog extends Schema {
  constructor() {
    super(
      sb
        .schema('migrationLog')
        .construct('MigrationLogEntry')
        .strict()
        .shape({
          _id: sb.string().required().default(''),
          runId: sb.string().required().maxLength(255).default(null),
          dataSourceName: sb
            .string()
            .required()
            .inArray(['account', 'project'])
            .default(null),
          contextKey: sb.string().required().maxLength(255).default(null),
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
          patchResults: sb.array().default([]),
          duration: sb.number().default(null),
          startedAt: sb.date().default(null),
          finishedAt: sb.date().default(null),
          error: sb.string().maxLength(10000).default(null),
          createdAt: sb.date().required().default(null),
        }),
    )
  }
}

export default SchemaMigrationLog
