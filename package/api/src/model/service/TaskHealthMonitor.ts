import { Task } from 'veysur-common'

import { RepoTask } from 'model/repo'
import { captureWithFingerprint, errorMessage } from 'common'

type Logger = Pick<Console, 'log'>

/**
 * Task-health alerting: the concern of surfacing a sick scheduled task to a
 * human, independent of how tasks get scheduled or executed. Owns stale
 * detection, execution-timeout alerts, and the failure back-off / BugSink
 * escalation. `ServiceTaskManager` delegates here.
 *
 * Stateless — everything it tracks (`consecutiveFailures`, `backedOffUntil`,
 * `staleSinceAt`) lives on the `Task` row via `RepoTask`.
 */
export class TaskHealthMonitor {
  constructor(
    private readonly repoTask: RepoTask,
    private readonly logger: Logger,
  ) {}

  /**
   * Alert when an enabled, not-backed-off task has not run for longer than
   * `max(2× its interval, 10 min)`. Catches a task that has silently stopped
   * being scheduled (the mailCanary / emailBounceProcessor failure mode from the
   * 2026-08 incident, where the task was disabled and nobody noticed for days).
   *
   * The 10-minute absolute floor stops sub-minute-interval tasks (e.g. the 60s
   * `email`/`processQueue` queue) from alerting on a routine deploy: the
   * task-manager CronJob misses a run of 1-minute ticks while the image cuts
   * over, which comfortably exceeds a bare `2× 60s` threshold but is not an
   * incident. A genuinely stalled task still surfaces within one alert cycle.
   *
   * Requires a second observation: the first tick past the threshold only
   * records `staleSinceAt`; the alert fires on a later tick once the task has
   * stayed stale for one further scheduling cycle. This suppresses the false
   * alarm when a deploy resets a task's interval or clears its backoff (the task
   * runs again within a tick or two, clearing `staleSinceAt`). Once alerting,
   * fires every tick while stale; BugSink groups on the fingerprint so Slack
   * only notifies once per episode.
   */
  async alertStale(): Promise<void> {
    const now = Date.now()

    let enabledTasks: Task[]
    try {
      enabledTasks = await this.repoTask.find({ enabled: true })
    } catch (error) {
      this.logger.log(
        `[TaskManager] Error loading tasks for staleness check: ${errorMessage(error)}`,
      )
      return
    }

    for (const task of enabledTasks) {
      if (!task.lastRunAt) continue
      if (task.backedOffUntil && task.backedOffUntil.getTime() > now) continue

      const staleAfterMs = Math.max(2 * task.interval * 1000, 10 * 60 * 1000)
      const ageMs = now - task.lastRunAt.getTime()
      if (ageMs <= staleAfterMs) continue

      // Confirm on a second observation before alerting. A deploy that resets a
      // task's interval or clears its backoff can leave lastRunAt momentarily
      // stale against the new schedule; the task runs again within a tick or two
      // and setLastRunAt clears staleSinceAt, so a transient gap never alerts.
      const confirmMs = Math.max(task.interval * 1000, 120000)

      if (!task.staleSinceAt) {
        try {
          await this.repoTask.setStaleSinceAt(task._id, new Date(now))
        } catch (error) {
          this.logger.log(
            `[TaskManager] Error recording staleSinceAt for ${task.name}: ${errorMessage(error)}`,
          )
        }
        this.logger.log(
          `[TaskManager] Task ${task.name} crossed stale threshold (last run ${Math.round(ageMs / 1000)}s ago); confirming on next tick`,
        )
        continue
      }

      if (now - task.staleSinceAt.getTime() < confirmMs) continue

      this.logger.log(
        `[TaskManager] Task ${task.name} is stale: last run ${Math.round(ageMs / 1000)}s ago (interval ${task.interval}s)`,
      )
      this.captureTaskAlert(
        'task-stale',
        task,
        `has not run for ${Math.round(ageMs / 1000)}s (interval ${task.interval}s)`,
      )
    }
  }

  /**
   * A running execution has exceeded its task's timeout. The caller has already
   * marked the execution failed and recorded the failure; this only raises the
   * BugSink alert.
   */
  alertExecutionTimeout(task: Task): void {
    this.captureTaskAlert(
      'task-execution-timeout',
      task,
      `execution timed out after ${task.timeout} minutes`,
    )
  }

  /**
   * Handle task failure with exponential back-off.
   *
   * No task is auto-disabled — `updateBackoff` holds it at the 24h cap and it
   * keeps retrying. The backoff machinery alone never surfaces a failing task to
   * a human, so escalate to BugSink here: `task-failing` on the second
   * consecutive failure (one failed run is usually a transient blip — a relay
   * restart during a deploy, a brief network flap — that the next run clears),
   * escalating to `task-persistently-failing` once it is pinned at the 24h cap.
   * Fingerprints dedupe to one Slack ping per episode.
   */
  async recordFailure(task: Task): Promise<void> {
    await this.repoTask.updateBackoff(task._id)

    const updatedTask = await this.repoTask.findOne({ _id: task._id })
    if (!updatedTask || !updatedTask.backedOffUntil) return

    this.logger.log(
      `[TaskManager] Task ${task.name} backed off until ${updatedTask.backedOffUntil.toISOString()} (${updatedTask.consecutiveFailures} failures)`,
    )

    if (updatedTask.consecutiveFailures >= 6) {
      this.captureTaskAlert(
        'task-persistently-failing',
        updatedTask,
        `has failed ${updatedTask.consecutiveFailures} times in a row and is capped at the 24h backoff`,
      )
    } else if (updatedTask.consecutiveFailures >= 2) {
      this.captureTaskAlert(
        'task-failing',
        updatedTask,
        `has failed ${updatedTask.consecutiveFailures} times in a row`,
      )
    }
  }

  /**
   * Raise a BugSink event for a task health problem, building the grouping
   * fingerprint and message prefix so the two cannot drift apart. BugSink groups
   * on the fingerprint so Slack only notifies once per episode.
   */
  private captureTaskAlert(slug: string, task: Task, detail: string): void {
    const message = `[TaskManager] Task ${task.name} (${task.task}.${task.action}) ${detail}`
    captureWithFingerprint([slug, task.task, task.action], new Error(message))
  }
}
