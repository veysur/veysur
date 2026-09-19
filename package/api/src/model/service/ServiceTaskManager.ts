import { Service } from 'mzen-server'
import { Task } from 'veysur-common'

import { RepoTask, RepoTaskExecution, RepoTaskLock } from 'model/repo'
import { errorMessage, errorStack, withCapturedConsole } from 'common'

import { TaskHealthMonitor } from './TaskHealthMonitor'

/**
 * Wall-clock ceiling for a single `startTasks()` drain. Checked before starting
 * each task, so a task already running is never interrupted. Sized to leave
 * headroom under the 60s CronJob tick for the common case: a handful of
 * sub-second catch-up tasks plus one self-pacing `email.processQueue` run.
 */
const TASK_RUN_BUDGET_MS = 45_000

/**
 * Service for Task Manager
 * Orchestrates task scheduling, execution monitoring, and cleanup
 */
export class ServiceTaskManager extends Service {
  constructor() {
    super({
      name: 'taskManager',
    })
  }

  /**
   * Task-health alerting (stale detection, timeout alerts, failure escalation).
   * A fresh instance per access is fine — the monitor is stateless and this
   * keeps test `getRepo` overrides flowing through.
   */
  private get health(): TaskHealthMonitor {
    return new TaskHealthMonitor(this.getRepo<RepoTask>('task'), this.logger)
  }

  /**
   * Main entry point: monitor → cleanup → schedule
   * Called by the CronJob every minute
   */
  async run(
    _options: Record<string, unknown> = {},
    _config: Record<string, unknown> = {},
  ): Promise<void> {
    this.logger.log('[TaskManager] Starting task manager run')

    try {
      // Phase 1: Monitor running tasks
      await this.monitorRunningTasks()

      // Phase 2: Cleanup old executions and expired locks
      await this.cleanupExecutions()

      // Phase 3: Schedule new tasks
      await this.startTasks()

      this.logger.log('[TaskManager] Task manager run completed')
    } catch (error) {
      this.logger.log(`[TaskManager] Error during run: ${errorMessage(error)}`)
      throw error
    }
  }

  /**
   * Monitor running tasks and detect stale executions
   * Stale detection uses per-task timeout
   */
  async monitorRunningTasks(): Promise<void> {
    const repoTaskExecution = this.getRepo<RepoTaskExecution>('taskExecution')
    const repoTask = this.getRepo<RepoTask>('task')

    const runningExecutions = await repoTaskExecution.findRunning()

    this.logger.log(
      `[TaskManager] Monitoring ${runningExecutions.length} running tasks`,
    )

    for (const execution of runningExecutions) {
      try {
        const task = await repoTask.findOne({ _id: execution.taskId })
        if (!task) continue

        const timeoutMs = (task.timeout || 10) * 60 * 1000
        const executionAge = Date.now() - execution.startedAt.getTime()

        if (executionAge > timeoutMs) {
          await repoTaskExecution.markFailed(
            execution._id,
            `Execution timed out after ${task.timeout} minutes`,
          )
          await this.health.recordFailure(task)
          this.logger.log(
            `[TaskManager] Execution ${execution._id} timed out after ${task.timeout} minutes`,
          )
          this.health.alertExecutionTimeout(task)
        }
      } catch (error) {
        this.logger.log(
          `[TaskManager] Error monitoring execution ${execution._id}: ${errorMessage(error)}`,
        )
      }
    }

    await this.health.alertStale()
  }

  /**
   * Cleanup old execution records and expired locks
   */
  async cleanupExecutions(): Promise<void> {
    const repoTask = this.getRepo<RepoTask>('task')
    const repoTaskExecution = this.getRepo<RepoTaskExecution>('taskExecution')
    const repoTaskLock = this.getRepo<RepoTaskLock>('taskLock')

    // Cleanup old executions for each task
    const tasks = await repoTask.find({})

    for (const task of tasks) {
      const executionsToDelete =
        await repoTaskExecution.findExecutionsToCleanup(task._id, 10, 50)

      if (executionsToDelete.length > 0) {
        await repoTaskExecution.deleteMany({
          _id: { $in: executionsToDelete },
        })
        this.logger.log(
          `[TaskManager] Cleaned up ${executionsToDelete.length} old executions for task ${task.name}`,
        )
      }
    }

    // Cleanup expired locks
    await repoTaskLock.cleanupExpiredLocks()
  }

  /**
   * Start tasks that are due to run.
   *
   * Drains due tasks within this run rather than executing a single one: a
   * one-task-per-tick limit starves a short-interval task (e.g. the 60s
   * `email`/`processQueue` queue) whenever the arrival rate of other due tasks
   * exceeds one per minute for a sustained window — exactly what happens at an
   * hour boundary when a batch of hourly and `start`-anchored daily tasks all
   * come due together.
   *
   * The drain is bounded three ways: a per-run task count (`maxConcurrency`), a
   * wall-clock budget (`TASK_RUN_BUDGET_MS`, checked before each task so a
   * running one is never cut off), and the DB-wide running-execution guard.
   * Candidates run in `lateness()` order (most behind its own cadence first) so
   * that when a run does hit its budget, the tasks left for the next tick are
   * the ones least harmed by waiting.
   */
  async startTasks(): Promise<void> {
    const repoTask = this.getRepo<RepoTask>('task')
    const repoTaskExecution = this.getRepo<RepoTaskExecution>('taskExecution')

    const perRunBudget =
      this.modelManager.config.taskManager?.maxConcurrency || 5

    // Find tasks that are enabled and not backed off
    const dueTasks = await repoTask.findDueTasks()

    this.logger.log(`[TaskManager] Found ${dueTasks.length} enabled tasks`)

    const candidates = dueTasks
      .filter((task) => this.isTaskDue(task))
      .sort((a, b) => this.lateness(b) - this.lateness(a))

    const deadline = Date.now() + TASK_RUN_BUDGET_MS
    let executedThisRun = 0

    for (const task of candidates) {
      if (executedThisRun >= perRunBudget) {
        this.logger.log(
          `[TaskManager] Per-run task budget reached (${perRunBudget})`,
        )
        return
      }

      if (Date.now() >= deadline) {
        this.logger.log(
          `[TaskManager] Run budget of ${TASK_RUN_BUDGET_MS}ms elapsed; deferring remaining tasks`,
        )
        return
      }

      try {
        const runningCount = await repoTaskExecution.countAllRunning()
        if (runningCount >= perRunBudget) {
          this.logger.log(
            `[TaskManager] Global max concurrency reached (${runningCount}/${perRunBudget})`,
          )
          return
        }

        if (!(await this.canStartTask(task))) {
          this.logger.log(
            `[TaskManager] Task ${task.name} is due but at concurrency limit`,
          )
          continue
        }

        await this.claimAndExecute(task)
        executedThisRun++
      } catch (error) {
        this.logger.log(
          `[TaskManager] Error scheduling task ${task.name}: ${errorMessage(error)}`,
        )
      }
    }
  }

  /**
   * How far behind its own cadence a task has fallen: time since its last run as
   * a multiple of its interval. A task on schedule scores ~1; one starved for
   * several intervals scores several times higher and sorts to the front of the
   * drain. This is what stops a short-interval task (the 60s mail queue) from
   * being perpetually last behind an hour-boundary batch of hourly and daily
   * tasks. A task that has never run sorts first.
   */
  private lateness(task: Task): number {
    if (!task.lastRunAt) return Number.POSITIVE_INFINITY
    return (Date.now() - task.lastRunAt.getTime()) / (task.interval * 1000)
  }

  /**
   * Claim a due task and run it in-process. `lastRunAt` / `lastScheduledAt` are
   * recorded before the execution record is created so a concurrent manager tick
   * sees the slot as taken and does not double-start it.
   */
  private async claimAndExecute(task: Task): Promise<void> {
    const repoTask = this.getRepo<RepoTask>('task')
    const repoTaskExecution = this.getRepo<RepoTaskExecution>('taskExecution')

    const now = new Date()
    const currentSlot = this.getCurrentSlot(task, now)!
    await repoTask.setLastRunAt(task._id, now, currentSlot)

    const execution = await repoTaskExecution.create({
      taskId: task._id,
      taskName: task.name,
      status: 'running',
      startedAt: new Date(),
      managerPodName: process.env.POD_NAME || null,
      managerHostname: process.env.HOSTNAME || null,
    })

    this.logger.log(`[TaskManager] Starting task ${task.name}`)

    await this.executeTask(task, execution._id)
  }

  /**
   * Calculate the current aligned slot for a task.
   * Returns null if now is before task.start.
   */
  getCurrentSlot(task: Task, now: Date): Date | null {
    if (!task.start) return null
    const startMs = task.start.getTime()
    const nowMs = now.getTime()
    if (nowMs < startMs) return null
    const intervalMs = task.interval * 1000
    const n = Math.floor((nowMs - startMs) / intervalMs)
    return new Date(startMs + n * intervalMs)
  }

  /**
   * Calculate if a task should run now using clock-aligned slots.
   * Anchors scheduling to start + N * interval so late runs don't compound.
   */
  isTaskDue(task: Task): boolean {
    const now = new Date()
    const currentSlot = this.getCurrentSlot(task, now)
    if (!currentSlot) return false
    return !task.lastScheduledAt || task.lastScheduledAt < currentSlot
  }

  /**
   * Check if task can start (concurrency limit)
   */
  async canStartTask(task: Task): Promise<boolean> {
    const repoTaskExecution = this.getRepo<RepoTaskExecution>('taskExecution')

    const runningCount = await repoTaskExecution.countRunning(task._id)

    return runningCount < task.concurrency
  }

  /**
   * Execute task in-process with comprehensive error handling
   */
  async executeTask(task: Task, executionId: string): Promise<void> {
    const repoTaskExecution = this.getRepo<RepoTaskExecution>('taskExecution')
    const repoTask = this.getRepo<RepoTask>('task')

    const taskOptions = { ...task.options, _executionId: executionId }
    const service = this.modelManager.services[task.task]

    if (!service) {
      const errorText = `Service '${task.task}' not found`
      this.logger.log(`[TaskManager] ${errorText}`)
      await this.failExecution(executionId, task, errorText)
      throw new Error(errorText)
    }

    if (typeof service[task.action] !== 'function') {
      const errorText = `Action '${task.action}' not found on service '${task.task}'`
      this.logger.log(`[TaskManager] ${errorText}`)
      await this.failExecution(executionId, task, errorText)
      throw new Error(errorText)
    }

    const run = await withCapturedConsole<unknown>(async () => {
      this.logger.log(
        `[TaskManager] Executing task ${task.name} (${task.task}.${task.action})`,
      )
      return service[task.action](taskOptions, this.modelManager.config)
    })

    if (!run.ok) {
      const message = errorMessage(run.error)
      const stack = errorStack(run.error)

      this.logger.log(`[TaskManager] Task ${task.name} failed: ${message}`)
      if (stack) {
        this.logger.log(`[TaskManager] Stack trace: ${stack}`)
      }

      await this.failExecution(executionId, task, message, run.log)

      // Re-throw to let K8s know the pod failed
      throw run.error
    }

    const softFailure = this.evaluateTaskResult(task, run.result)

    if (softFailure) {
      // The action resolved but reported internal errors (e.g. a mailbox pass
      // that could not connect). Record the execution as failed and drive the
      // backoff counter, but do NOT re-throw - the pod exit stays 0.
      this.logger.log(
        `[TaskManager] Task ${task.name} reported a soft failure: ${softFailure}`,
      )
      await this.failExecution(executionId, task, softFailure, run.log)
      return
    }

    await repoTaskExecution.markCompleted(executionId, run.log)
    await repoTask.resetFailureCount(task._id)

    this.logger.log(`[TaskManager] Task ${task.name} completed successfully`)
  }

  /**
   * Record an execution as failed and drive the backoff / BugSink escalation.
   * Callers keep their own throw/return control flow — this only owns the two
   * side effects that every failure path shares.
   */
  private async failExecution(
    executionId: string,
    task: Task,
    message: string,
    capturedLog: string | null = null,
  ): Promise<void> {
    const repoTaskExecution = this.getRepo<RepoTaskExecution>('taskExecution')
    await repoTaskExecution.markFailed(executionId, message, capturedLog)
    await this.health.recordFailure(task)
  }

  /**
   * A task action can resolve normally while still reporting internal errors via
   * its return shape (`{ errors }` / `{ failed }`). Treat a non-zero count as a
   * failed execution so it shows in history and drives the health alerts, rather
   * than being silently recorded as completed.
   *
   * Opt-in per task via `Task.failOnErrorCount`: other tasks (e.g. the payment
   * scheduler) return a `failed` count for a single bad row on an otherwise
   * healthy run, and must not be backed off for that.
   *
   * Returns a summary string when the result is a soft failure, otherwise null.
   */
  private evaluateTaskResult(task: Task, result: unknown): string | null {
    if (!task.failOnErrorCount) return null
    if (!result || typeof result !== 'object') return null
    const record = result as Record<string, unknown>
    const errors = typeof record.errors === 'number' ? record.errors : 0
    const failed = typeof record.failed === 'number' ? record.failed : 0
    if (errors <= 0 && failed <= 0) return null

    const parts: string[] = []
    if (errors > 0) parts.push(`${errors} error(s)`)
    if (failed > 0) parts.push(`${failed} failed`)
    return `Task action reported ${parts.join(', ')}`
  }
}
