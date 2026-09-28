import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'
import { Task } from 'veysur-common'

/**
 * Seed the async export job queue processing task. Idempotent - skips if a
 * task with this (task, action) pair already exists. See
 * docs/plan/formulate-a-phased-plan-typed-rain.md and
 * docs/mail-queue-pacing.md (the pattern this task follows).
 */
export default class SeedDataTransferProcessTask
  implements DatabasePatchInterface
{
  version = '2026-09-24_1000'
  description = 'Seed data transfer job queue process scheduled task'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const taskData: Partial<Task> = {
      name: 'Data Transfer Job Process',
      description:
        'Compile due async survey export jobs (ServiceDataTransferJob) off the request',
      enabled: true,
      start: new Date('2026-01-01T00:00:00.000Z'),
      interval: 15, // seconds
      concurrency: 1,
      timeout: 10, // minutes
      task: 'dataTransferJob',
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
