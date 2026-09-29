import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'
import { Task } from 'veysur-common'

/**
 * Seed the mail deliverability canary scheduled task.
 * Idempotent - skips if a task with this (task, action) pair already exists.
 */
export default class SeedMailCanaryTask implements DatabasePatchInterface {
  version = '2026-08-19_1000'
  description = 'Seed mail deliverability canary scheduled task'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const taskData: Partial<Task> = {
      name: 'Mail Deliverability Canary',
      description:
        'Send a probe email and confirm IMAP delivery to catch deliverability regressions before real signups/contacts fail',
      enabled: true,
      start: new Date('2026-01-01T00:00:00.000Z'),
      interval: 600, // 10 minutes
      concurrency: 1,
      timeout: 8, // minutes - well above the 180s poll deadline, below the interval
      task: 'mailCanary',
      action: 'run',
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
