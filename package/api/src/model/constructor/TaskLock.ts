/**
 * TaskLock Constructor
 * Represents a distributed lock for task concurrency control
 */
export class TaskLock {
  _id: string
  lockKey: string // Unique identifier (e.g., "payment-project-abc123")
  resourceType: string // Type of resource ("project", "survey", etc.)
  resourceId: string // ID of the resource being locked
  executionId: string // TaskExecution ID holding the lock
  lockedAt: Date // When lock was acquired
  expiresAt: Date // When lock expires (TTL)
  note: string | null // Optional context/debugging info

  constructor(data: Partial<TaskLock> = {}) {
    this._id = data._id || ''
    this.lockKey = data.lockKey || ''
    this.resourceType = data.resourceType || ''
    this.resourceId = data.resourceId || ''
    this.executionId = data.executionId || ''
    this.lockedAt = data.lockedAt || new Date()
    this.expiresAt = data.expiresAt || new Date()
    this.note = data.note || null
  }
}
