import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from 'mzen-server'
import { TaskExecution } from 'veysur-common'

const TaskExecutionStatus = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

/**
 * Repository for TaskExecution entities
 * Tracks individual task execution runs with status and logging
 */
export class RepoTaskExecution extends Repo<TaskExecution> {
  constructor() {
    super({
      name: 'taskExecution',
      autoIndex: false,
      relations: {},
      indexes: {
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        startedAt: {
          spec: { startedAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
        taskId: {
          spec: { taskId: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
        taskStatus: {
          spec: { taskId: 1, status: 1, startedAt: -1 },
          options: { typeHint: { startedAt: TYPE_HINT_TIMESTAMP } },
        },
        status: {
          spec: { status: 1, createdAt: -1 },
          options: { typeHint: { createdAt: TYPE_HINT_TIMESTAMP } },
        },
      },
    })
  }

  /**
   * Create a new task execution
   */
  async create(executionData: Partial<TaskExecution>): Promise<TaskExecution> {
    const { isValid, errors } = await this.schema.validatePaths(executionData)
    if (!isValid) {
      throw new ServerErrorBadRequest(errors)
    }

    await this.schema.applyFilters(executionData)
    const execution = new TaskExecution(executionData)
    await this.insertOne(execution)

    return execution
  }

  /**
   * Count running executions for a task
   */
  async countRunning(taskId: string): Promise<number> {
    return this.count({
      taskId,
      status: TaskExecutionStatus.RUNNING,
    })
  }

  /**
   * Find executions to cleanup based on retention policy
   * Keep last 10 successful, last 50 failed
   */
  async findExecutionsToCleanup(
    taskId: string,
    successRetention: number = 10,
    failureRetention: number = 50,
  ): Promise<string[]> {
    const toDelete: string[] = []

    // Find old successful executions (keep last N)
    const completedExecs = await this.find(
      { taskId, status: TaskExecutionStatus.COMPLETED },
      { sort: { createdAt: -1 }, skip: successRetention, limit: 1000 },
    )
    toDelete.push(...completedExecs.map((e) => e._id))

    // Find old failed executions (keep last N)
    const failedExecs = await this.find(
      { taskId, status: TaskExecutionStatus.FAILED },
      { sort: { createdAt: -1 }, skip: failureRetention, limit: 1000 },
    )
    toDelete.push(...failedExecs.map((e) => e._id))

    return toDelete
  }

  /**
   * Mark execution as completed
   */
  async markCompleted(
    executionId: string,
    log: string | null = null,
  ): Promise<void> {
    const now = new Date()
    const execution = await this.findOne({ _id: executionId })
    if (!execution) return

    const duration = execution.startedAt
      ? now.getTime() - execution.startedAt.getTime()
      : null

    await this.updateOne(
      { _id: executionId },
      {
        $set: {
          status: TaskExecutionStatus.COMPLETED,
          completedAt: now,
          stoppedAt: now,
          duration,
          log,
        },
      },
    )
  }

  /**
   * Mark execution as failed
   */
  async markFailed(
    executionId: string,
    error: string | null = null,
    log: string | null = null,
  ): Promise<void> {
    const now = new Date()
    const execution = await this.findOne({ _id: executionId })
    if (!execution) return

    const duration = execution.startedAt
      ? now.getTime() - execution.startedAt.getTime()
      : null

    await this.updateOne(
      { _id: executionId },
      {
        $set: {
          status: TaskExecutionStatus.FAILED,
          stoppedAt: now,
          duration,
          error,
          log,
        },
      },
    )
  }

  /**
   * Find all running executions
   */
  async findRunning(): Promise<TaskExecution[]> {
    return this.find({
      status: TaskExecutionStatus.RUNNING,
    })
  }

  /**
   * Count total running executions across all tasks (for global max limit)
   */
  async countAllRunning(): Promise<number> {
    return this.count({
      status: TaskExecutionStatus.RUNNING,
    })
  }
}

export default RepoTaskExecution
