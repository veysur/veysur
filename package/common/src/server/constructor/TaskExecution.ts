import { SchemaConstructor } from '@datacapy/schema'
import { SchemaTaskExecution } from '../schema/SchemaTaskExecution'

/**
 * TaskExecution Constructor
 * Represents a single execution run of a scheduled task.
 * Fields come from {@link SchemaTaskExecution}.
 */
export class TaskExecution extends SchemaConstructor.from(
  SchemaTaskExecution,
) {}
