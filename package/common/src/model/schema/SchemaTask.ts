import { Schema, sb } from '@datacapy/schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_ENTITY_NAME,
} from './constant'

/**
 * Task Schema
 * Defines scheduled tasks with their configuration and execution parameters
 */
export class SchemaTask extends Schema {
  constructor() {
    super(
      sb
        .schema('task')
        .construct('Task')
        .strict()
        .shape({
          _id: sb.string().default('').maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          name: sb
            .string()
            .required()
            .trim()
            .maxLength(SCHEMA_LENGTH_MAX_ENTITY_NAME),
          description: sb.string().default('').maxLength(1000),
          enabled: sb.boolean().default(true),
          start: sb.date().required(),
          interval: sb.number().required(), // Seconds between runs
          concurrency: sb.number().default(1), // Max concurrent executions
          timeout: sb.number().default(10), // Timeout in minutes (default 10, max 24 hours)
          task: sb.string().required().maxLength(100), // Service name
          action: sb.string().required().maxLength(100), // Service method
          options: sb.object().matchAll(sb.mixed()).default({}), // JSON options passed to task
          consecutiveFailures: sb.number().default(0),
          failOnErrorCount: sb.boolean().default(false),
          lastFailureAt: sb.date().default(null),
          lastRunAt: sb.date().default(null),
          lastScheduledAt: sb.date().default(null),
          staleSinceAt: sb.date().default(null),
          backedOffUntil: sb.date().default(null),
          createdAt: sb.date().default('now'),
          updatedAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
