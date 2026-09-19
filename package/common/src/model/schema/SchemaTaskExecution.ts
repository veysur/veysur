import { Schema, sb } from 'mzen-schema'

import {
  SCHEMA_LENGTH_MAX_INTERNAL_ID,
  SCHEMA_LENGTH_MAX_ENTITY_NAME,
} from './constant'

/**
 * TaskExecution Schema
 * Tracks individual task execution runs with status and logging
 */
export class SchemaTaskExecution extends Schema {
  constructor() {
    super(
      sb
        .schema('taskExecution')
        .construct('TaskExecution')
        .strict()
        .shape({
          _id: sb.string().default('').maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          taskId: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_INTERNAL_ID),
          taskName: sb
            .string()
            .required()
            .maxLength(SCHEMA_LENGTH_MAX_ENTITY_NAME),
          status: sb.string().required(), // 'running' | 'completed' | 'failed' | 'stopped'
          startedAt: sb.date().default('now'),
          stoppedAt: sb.date().default(null),
          completedAt: sb.date().default(null),
          duration: sb.number().default(null), // Milliseconds
          managerPodName: sb.string().default(null).maxLength(255),
          managerHostname: sb.string().default(null).maxLength(255),
          log: sb.string().default(null).maxLength(50000),
          error: sb.string().default(null).maxLength(10000),
          createdAt: sb.date().default('now'),
        })
        .build(),
    )
  }
}
