/**
 * Task Constructor
 * Represents a scheduled task definition with execution parameters
 */
export class Task {
  _id: string
  name: string // Human-readable name for the task
  description: string
  enabled: boolean
  start: Date | null // First run start date
  interval: number // Seconds between runs
  concurrency: number // Max concurrent executions
  timeout: number // Timeout in minutes before execution considered stale
  task: string // Service name
  action: string // Service method
  options: Record<string, unknown> // JSON options passed to task
  consecutiveFailures: number
  failOnErrorCount: boolean // When true, a run that resolves with `{ errors|failed > 0 }` counts as a failed execution (opt-in per task return contract)
  lastFailureAt: Date | null
  lastRunAt: Date | null
  lastScheduledAt: Date | null
  staleSinceAt: Date | null // First tick the task was seen past its stale threshold; cleared when it next runs
  backedOffUntil: Date | null
  createdAt: Date
  updatedAt: Date

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
