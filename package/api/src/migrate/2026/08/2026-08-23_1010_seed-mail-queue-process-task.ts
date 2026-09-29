import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'
import { Task } from 'veysur-common'

/**
 * Seed the paced bulk-invite/reminder mail queue processing task.
 * Idempotent - skips if a task with this (task, action) pair already exists.
 * See docs/mail-queue-pacing.md.
 */
export default class SeedMailQueueProcessTask implements DatabasePatchInterface {
  version = '2026-08-23_1010'
  description = 'Seed mail queue process scheduled task'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const taskData: Partial<Task> = {
      name: 'Mail Queue Process',
      description:
        'Dispatch due rows from the paced bulk invite/reminder email queue, per-project rate-limited by EMAIL_SEND_RATE_PER_HOUR',
      enabled: true,
      start: new Date('2026-01-01T00:00:00.000Z'),
      interval: 60, // 1 minute
      concurrency: 1,
      timeout: 5, // minutes
      task: 'email',
      action: 'processQueue',
      options: {},
      consecutiveFailures: 0,
      lastFailureAt: null,
      backedOffUntil: null,
    }

    const existing = await repo.findOne({
      task: taskData.task,
      action: taskData.action,
    })

    if (existing) {
      console.log(`⚠ Task ${taskData.name} already exists, skipping`)
      return
    }

    await repo.insertOne(taskData)
    console.log(`✓ Created task: ${taskData.name}`)
  }
}
