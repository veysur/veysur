import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaTaskExecution } from './TaskExecution.schema'

type InternalId = string & t.MaxLength<17>

/**
 * A single execution run of a scheduled task.
 *
 * @schema taskExecution construct=TaskExecution strict
 */
export interface TaskExecutionData {
  _id: InternalId & t.Default<''>
  taskId: InternalId & t.Required
  taskName: string & t.Required & t.MaxLength<255>
  /** 'running' | 'completed' | 'failed' | 'stopped'; kept a plain string, as before. */
  status: string & t.Required & t.Default<'running'>
  startedAt: Date & t.Default<'now'>
  stoppedAt: (Date & t.Default<null>) | null
  completedAt: (Date & t.Default<null>) | null
  /** Milliseconds. */
  duration: (number & t.Default<null>) | null
  managerPodName: (string & t.Default<null> & t.MaxLength<255>) | null
  managerHostname: (string & t.Default<null> & t.MaxLength<255>) | null
  log: (string & t.Default<null> & t.MaxLength<50000>) | null
  error: (string & t.Default<null> & t.MaxLength<10000>) | null
  createdAt: Date & t.Default<'now'>
}

export class TaskExecution extends SchemaConstructor.from(
  SchemaTaskExecution,
) {}
