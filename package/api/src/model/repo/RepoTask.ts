import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from '@datacapy/server'
import { Task } from 'veysur-common'

const MINUTE_MS = 60 * 1000

/**
 * Exponential back-off schedule, indexed by (consecutiveFailures - 1). The last
 * entry (24h) is held indefinitely once reached — no task is ever auto-disabled.
 */
const BACKOFF_STEPS_MS = [
  5 * MINUTE_MS,
  15 * MINUTE_MS,
  60 * MINUTE_MS,
  6 * 60 * MINUTE_MS,
  24 * 60 * MINUTE_MS,
]

/**
 * Repository for Task entities
 * Manages scheduled task definitions with execution parameters
 */
export class RepoTask extends Repo<Task> {
  constructor() {
    super({
      name: 'task',
      autoIndex: false,
      relations: {},
      indexes: {
        name: {
          spec: { name: 1 },
          options: { unique: true },
        },
        enabled: {
          spec: { enabled: 1, backedOffUntil: 1 },
          options: { typeHint: { backedOffUntil: TYPE_HINT_TIMESTAMP } },
        },
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
      },
    })
  }

  /**
   * Create a new task queue
   */
  async create(taskData: Partial<Task>): Promise<Task> {
    const { isValid, errors } = await this.schema.validatePaths(taskData)
    if (!isValid) {
      throw new ServerErrorBadRequest(errors)
    }

    await this.schema.applyFilters(taskData)
    const task = new Task(taskData)
    await this.insertOne(task)

    return task
  }

  /**
   * Find tasks that are enabled and not backed off
   */
  async findDueTasks(): Promise<Task[]> {
    const now = new Date()
    return this.find({
      enabled: true,
      $or: [{ backedOffUntil: null }, { backedOffUntil: { $lte: now } }],
    })
  }

  /**
   * Update back-off status for a task after failure.
   * Exponential back-off: 5min → 15min → 1hr → 6hr → 24hr, then held at the 24h
   * cap indefinitely. No task is ever auto-disabled — a disabled task is how the
   * 2026-08 outage stayed hidden. A task keeps retrying (and
   * ServiceTaskManager keeps escalating to BugSink) until the underlying issue
   * is fixed or an operator sets `enabled: false` by hand. This method never
   * touches enable state.
   */
  async updateBackoff(taskId: string): Promise<void> {
    const task = await this.findOne({ _id: taskId })
    if (!task) return

    const failures = task.consecutiveFailures + 1
    const now = new Date()

    const stepIndex = Math.min(failures, BACKOFF_STEPS_MS.length) - 1
    const backedOffUntil = new Date(now.getTime() + BACKOFF_STEPS_MS[stepIndex])

    await this.updateOne(
      { _id: taskId },
      {
        $set: {
          consecutiveFailures: failures,
          lastFailureAt: now,
          backedOffUntil,
          updatedAt: now,
        },
      },
    )
  }

  async setLastRunAt(
    taskId: string,
    lastRunAt: Date,
    lastScheduledAt: Date,
  ): Promise<void> {
    await this.updateOne(
      { _id: taskId },
      {
        $set: {
          lastRunAt,
          lastScheduledAt,
          // The task just ran — any prior stale-confirmation marker is void.
          staleSinceAt: null,
          updatedAt: new Date(),
        },
      },
    )
  }

  async setStaleSinceAt(
    taskId: string,
    staleSinceAt: Date | null,
  ): Promise<void> {
    await this.updateOne(
      { _id: taskId },
      {
        $set: {
          staleSinceAt,
          updatedAt: new Date(),
        },
      },
    )
  }

  async resetFailureCount(taskId: string): Promise<void> {
    await this.updateOne(
      { _id: taskId },
      {
        $set: {
          consecutiveFailures: 0,
          lastFailureAt: null,
          backedOffUntil: null,
          staleSinceAt: null,
          updatedAt: new Date(),
        },
      },
    )
  }
}

export default RepoTask
