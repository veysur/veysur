import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'
import { Task } from 'veysur-common'

/**
 * Seed the core background scheduled tasks in their final configuration.
 * Idempotent per task - skips any task whose (task, action) pair already exists.
 *
 * The platform-layer tasks were
 * split out into `platform/2026/08/2026-08-18_1041_seed-platform-scheduled-tasks`
 * (WS5) — their `task:` services are not registered in a self-hosted deployment.
 */
export default class SeedScheduledTasks implements DatabasePatchInterface {
  version = '2026-08-18_1040'
  description = 'Seed core background scheduled tasks'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const tasks: Partial<Task>[] = [
      {
        name: 'Cleanup Pending Projects',
        description:
          'Delete stale pending projects (not updated within the past hour)',
        enabled: true,
        start: new Date('2026-01-01T00:00:00.000Z'),
        interval: 10800, // 3 hours in seconds
        concurrency: 1,
        task: 'project',
        action: 'cleanupPendingProjects',
        options: {},
        consecutiveFailures: 0,
        lastFailureAt: null,
        backedOffUntil: null,
      },
      {
        name: 'Hard Delete Old Files',
        description:
          'Permanently delete files soft-deleted more than 1 hour ago',
        enabled: true,
        start: new Date('2026-03-13T03:00:00.000Z'),
        interval: 3600,
        concurrency: 1,
        timeout: 30, // 30 minutes — may process many files across many projects
        task: 'fileDeletion',
        action: 'hardDeleteAll',
        options: { olderThan: 'PT1H' },
        consecutiveFailures: 0,
        lastFailureAt: null,
        backedOffUntil: null,
      },
      {
        name: 'Process Email Bounces',
        description:
          'Poll IMAP mailboxes for DSN bounce notifications and ARF spam complaint reports, then update the suppression list and participant records',
        enabled: true,
        start: new Date('2026-01-01T00:00:00.000Z'),
        interval: 600,
        concurrency: 1,
        task: 'emailBounceProcessor',
        action: 'run',
        options: {},
        consecutiveFailures: 0,
        lastFailureAt: null,
        backedOffUntil: null,
      },
      {
        name: 'Hard Delete Old Projects',
        description:
          'Permanently delete projects soft-deleted more than 1 month ago',
        enabled: true,
        start: new Date('2026-07-13T03:00:00.000Z'),
        interval: 86400,
        concurrency: 1,
        timeout: 30,
        task: 'project',
        action: 'hardDeleteAll',
        options: { olderThan: 'P1M' },
        consecutiveFailures: 0,
        lastFailureAt: null,
        backedOffUntil: null,
      },
      {
        name: 'Send Project Deletion Reminders',
        description:
          'Email owners of soft-deleted projects ~7 days before permanent deletion',
        enabled: true,
        start: new Date('2026-08-01T03:00:00.000Z'),
        interval: 86400,
        concurrency: 1,
        timeout: 10,
        task: 'project',
        action: 'sendDeletionReminders',
        options: { reminderBeforeDays: 7 },
        consecutiveFailures: 0,
        lastFailureAt: null,
        backedOffUntil: null,
      },
      {
        name: 'Send Account Deletion Reminders',
        description:
          'Email owners of soft-deleted accounts ~7 days before permanent anonymisation, with a freshly generated restore code',
        enabled: true,
        start: new Date('2026-08-01T03:00:00.000Z'),
        interval: 86400,
        concurrency: 1,
        timeout: 10,
        task: 'user',
        action: 'sendDeletionReminders',
        options: { reminderBeforeDays: 7 },
        consecutiveFailures: 0,
        lastFailureAt: null,
        backedOffUntil: null,
      },
      {
        name: 'Anonymize Old Deleted Users',
        description:
          'Scrub PII from accounts soft-deleted more than 1 month ago; the row is retained, not hard-deleted',
        enabled: true,
        // Anchored a few hours after the project deletion reminder job (03:00 UTC)
        // to avoid same-tick races between the two daily jobs.
        start: new Date('2026-08-01T06:00:00.000Z'),
        interval: 86400,
        concurrency: 1,
        timeout: 10,
        task: 'user',
        action: 'anonymizeAll',
        options: { olderThan: 'P1M' },
        consecutiveFailures: 0,
        lastFailureAt: null,
        backedOffUntil: null,
      },
    ]

    for (const taskData of tasks) {
      const existing = await repo.findOne({
        task: taskData.task,
        action: taskData.action,
      })

      if (existing) {
        console.log(`⚠ Task ${taskData.name} already exists, skipping`)
        continue
      }

      await repo.insertOne(taskData)
      console.log(`✓ Created task: ${taskData.name}`)
    }
  }
}
