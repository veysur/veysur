import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'
import { Task } from 'veysur-common'

/**
 * DataTransferJob.cleanupOld() no longer exists - ServiceNotification.cleanupOld()
 * replaces it, deleting a job's row as a side effect of its related
 * Notification aging out (see ServiceNotification's doc comment). Removes
 * the now-dead 'dataTransferJob'/'cleanupOld' task and seeds
 * 'notification'/'cleanupOld' in its place. Idempotent.
 */
export default class ReplaceDataTransferCleanupWithNotificationCleanup
  implements DatabasePatchInterface
{
  version = '2026-09-24_1200'
  description = 'Replace DataTransferJob cleanup task with Notification cleanup task'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    await repo.deleteOne({ task: 'dataTransferJob', action: 'cleanupOld' })

    const taskData: Partial<Task> = {
      name: 'Notification Cleanup',
      description:
        'Delete read/dismissed Notification rows (and their related DataTransferJob row) older than 12h (ServiceNotification)',
      enabled: true,
      start: new Date('2026-01-01T00:00:00.000Z'),
      interval: 3600, // 1 hour, in seconds
      concurrency: 1,
      timeout: 10, // minutes
      task: 'notification',
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
