// Generated from Task.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { TaskData } from './Task'

export class SchemaTask extends Schema.from(
  sb
    .schema('task')
    .construct('Task')
    .strict()
    .shape({
      _id: sb.string().default('').maxLength(17),
      name: sb.string().required().init('').maxLength(255).trim(),
      description: sb.string().default('').maxLength(1000),
      enabled: sb.boolean().default(true),
      start: sb.date().required().init(null),
      interval: sb.number().required().init(0),
      concurrency: sb.number().default(1),
      timeout: sb.number().default(10),
      task: sb.string().required().init('').maxLength(100),
      action: sb.string().required().init('').maxLength(100),
      options: sb
        .object()
        .as<Record<string, unknown>>()
        .default({})
        .strict(false),
      consecutiveFailures: sb.number().default(0),
      failOnErrorCount: sb.boolean().default(false),
      lastFailureAt: sb.date().default(null),
      lastRunAt: sb.date().default(null),
      lastScheduledAt: sb.date().default(null),
      staleSinceAt: sb.date().default(null),
      backedOffUntil: sb.date().default(null),
      createdAt: sb.date().default('now'),
      updatedAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaTask: AssertSchema<SchemaTask, TaskData> = true
void _checkSchemaTask
