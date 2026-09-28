import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'
import { Task } from 'veysur-common'

/**
 * Seed the DataTransferJob cleanup task: deletes completed/failed jobs older
 * than 12h (ServiceDataTransferJob.cleanupOld()). Idempotent - skips if a
 * task with this (task, action) pair already exists. Same pattern as
 * 2026-09-24_1000_seed-data-transfer-process-task.ts.
 */
export default class SeedDataTransferCleanupTask
  implements DatabasePatchInterface
{
  version = '2026-09-24_1100'
  description = 'Seed data transfer job cleanup scheduled task'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const taskData: Partial<Task> = {
      name: 'Data Transfer Job Cleanup',
      description:
        'Delete completed/failed DataTransferJob rows older than 12h (ServiceDataTransferJob)',
      enabled: true,
      start: new Date('2026-01-01T00:00:00.000Z'),
      interval: 3600, // 1 hour, in seconds
      concurrency: 1,
      timeout: 10, // minutes
      task: 'dataTransferJob',
      action: 'cleanupOld',
      options: { olderThan: 'PT12H' },
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
