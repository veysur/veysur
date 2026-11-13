// Generated from TaskExecution.ts by datacapy-gen. Do not edit.
// cspell:disable
import { Schema, SchemaBuilder as sb } from '@datacapy/schema'
import type { AssertSchema } from '@datacapy/schema'
import type { TaskExecutionData } from './TaskExecution'

export class SchemaTaskExecution extends Schema.from(
  sb
    .schema('taskExecution')
    .construct('TaskExecution')
    .strict()
    .shape({
      _id: sb.string().default('').maxLength(17),
      taskId: sb.string().required().maxLength(17),
      taskName: sb.string().required().maxLength(255),
      status: sb.string().required().default('running'),
      startedAt: sb.date().default('now'),
      stoppedAt: sb.date().default(null),
      completedAt: sb.date().default(null),
      duration: sb.number().default(null),
      managerPodName: sb.string().default(null).maxLength(255),
      managerHostname: sb.string().default(null).maxLength(255),
      log: sb.string().default(null).maxLength(50000),
      error: sb.string().default(null).maxLength(10000),
      createdAt: sb.date().default('now'),
    }),
) {}

const _checkSchemaTaskExecution: AssertSchema<
  SchemaTaskExecution,
  TaskExecutionData
> = true
void _checkSchemaTaskExecution
