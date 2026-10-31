import { Infer, SchemaBuilder as sb } from '@datacapy/schema'
import { taskExecutionShape } from '../schema/SchemaTaskExecution'

/**
 * TaskExecution Constructor
 * Represents a single execution run of a scheduled task
 */
export class TaskExecution {
  constructor(data: Partial<TaskExecution> = {}) {
    Object.assign(this, sb.applyDefaults(taskExecutionShape, data))
  }
}

export interface TaskExecution extends Infer<typeof taskExecutionShape> {}
