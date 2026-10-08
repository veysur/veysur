import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'
import { Task } from 'veysur-common'

/**
 * Seed the embed artefact repair task: rewrites missing artefacts and stale
 * pointers for live, embed-enabled surveys (ServiceSurveyEmbedArtefact.repairAll()).
 * Idempotent - skips if a task with this (task, action) pair already exists.
 * Same pattern as 2026-09-24_1100_seed-data-transfer-cleanup-task.ts.
 */
export default class SeedEmbedArtefactRepairTask implements DatabasePatchInterface {
  version = '2026-10-07_1000'
  description = 'Seed embed artefact repair scheduled task'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const taskData: Partial<Task> = {
      name: 'Embed Artefact Repair',
      description:
        'Rewrite missing embed artefacts and stale pointers for live embed-enabled surveys (ServiceSurveyEmbedArtefact)',
      enabled: true,
      start: new Date('2026-01-01T03:30:00.000Z'),
      interval: 86400, // daily, in seconds
      concurrency: 1,
      timeout: 30, // minutes
      task: 'surveyEmbedArtefact',
      action: 'repairAll',
      options: {},
      failOnErrorCount: true,
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
