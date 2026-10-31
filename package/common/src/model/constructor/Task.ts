import { Infer } from '@datacapy/schema'
import { taskShape } from '../schema/SchemaTask'

/**
 * Task Constructor
 * Represents a scheduled task definition with execution parameters
 */
export class Task {
  constructor(data: Partial<Task> = {}) {
    this._id = data._id || ''
    this.name = data.name || ''
    this.description = data.description || ''
    this.enabled = data.enabled !== undefined ? data.enabled : true
    this.start = data.start || null
    this.interval = data.interval || 0
    this.concurrency = data.concurrency || 1
    this.timeout = data.timeout || 10
    this.task = data.task || ''
    this.action = data.action || ''
    this.options = data.options || {}
    this.consecutiveFailures = data.consecutiveFailures || 0
    this.failOnErrorCount = data.failOnErrorCount ?? false
    this.lastFailureAt = data.lastFailureAt || null
    this.lastRunAt = data.lastRunAt || null
    this.lastScheduledAt = data.lastScheduledAt || null
    this.staleSinceAt = data.staleSinceAt || null
    this.backedOffUntil = data.backedOffUntil || null
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }
}

export interface Task extends Infer<typeof taskShape> {}
