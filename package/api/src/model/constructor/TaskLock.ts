import { SchemaConstructor } from '@datacapy/schema'

import { SchemaTaskLock } from '../schema/SchemaTaskLock'

/**
 * Fields come from {@link SchemaTaskLock}.
 *
 * A distributed lock for task concurrency control. `lockKey` is the unique
 * identifier (for example "export-project-abc123"), `executionId` the
 * TaskExecution holding it, and `expiresAt` its TTL.
 */
export class TaskLock extends SchemaConstructor.from(SchemaTaskLock) {}

export default TaskLock
