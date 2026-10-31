import { Infer } from '@datacapy/schema'
import { taskExecutionShape } from '../schema/SchemaTaskExecution'

/**
 * TaskExecution Constructor
 * Represents a single execution run of a scheduled task
 */
export class TaskExecution {
  constructor(data: Partial<TaskExecution> = {}) {
    this._id = data._id || ''
    this.taskId = data.taskId || ''
    this.taskName = data.taskName || ''
    this.status = data.status || 'running'
    this.startedAt = data.startedAt || new Date()
    this.stoppedAt = data.stoppedAt || null
    this.completedAt = data.completedAt || null
    this.duration = data.duration || null
    this.managerPodName = data.managerPodName || null
    this.managerHostname = data.managerHostname || null
    this.log = data.log || null
    this.error = data.error || null
    this.createdAt = data.createdAt || new Date()
  }
}

export interface TaskExecution extends Infer<typeof taskExecutionShape> {}
