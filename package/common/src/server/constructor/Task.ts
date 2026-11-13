import { SchemaConstructor } from '@datacapy/schema'
import type { tags as t } from '@datacapy/schema'

import { SchemaTask } from './Task.schema'

type InternalId = string & t.MaxLength<17>

/**
 * A scheduled task definition with its execution parameters.
 *
 * @schema task construct=Task strict
 */
export interface TaskData {
  _id: InternalId & t.Default<''>
  name: string & t.Required & t.Init<''> & t.Trim & t.MaxLength<255>
  description: string & t.Default<''> & t.MaxLength<1000>
  enabled: boolean & t.Default<true>
  start: Date & t.Required & t.Init<null>
  /** Seconds between runs. */
  interval: number & t.Required & t.Init<0>
  /** Max concurrent executions. */
  concurrency: number & t.Default<1>
  /** Timeout in minutes (default 10, max 24 hours). */
  timeout: number & t.Default<10>
  /** Service name. */
  task: string & t.Required & t.Init<''> & t.MaxLength<100>
  /** Service method. */
  action: string & t.Required & t.Init<''> & t.MaxLength<100>
  /** JSON options passed to the task. */
  options: Record<string, unknown> & t.NonStrict & t.Default<t.EmptyObject>
  consecutiveFailures: number & t.Default<0>
  failOnErrorCount: boolean & t.Default<false>
  lastFailureAt: (Date & t.Default<null>) | null
  lastRunAt: (Date & t.Default<null>) | null
  lastScheduledAt: (Date & t.Default<null>) | null
  staleSinceAt: (Date & t.Default<null>) | null
  backedOffUntil: (Date & t.Default<null>) | null
  createdAt: Date & t.Default<'now'>
  updatedAt: Date & t.Default<'now'>
}

export class Task extends SchemaConstructor.from(SchemaTask) {}
