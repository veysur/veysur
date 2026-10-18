import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'
import { Task } from 'veysur-common'

/**
 * Seed the project-settings field-encryption rotation task, disabled. An operator enables it
 * during a key rotation (see docs/encryption.md); it ships with dryRun on so the
 * first run only reports. Idempotent - skips if a task with this (task, action)
 * pair already exists.
 */
export default class SeedEncryptionRotationProjectSettingsTask implements DatabasePatchInterface {
  version = '2026-10-18_1200'
  description =
    'Seed project-settings field-encryption rotation scheduled task (disabled)'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const taskData: Partial<Task> = {
      name: 'Field Encryption Rotation (project settings)',
      description:
        'Re-wrap the encrypted settings fields of each project under the active encryption key (ServiceEncryptionRotation). Enable only during a key rotation',
      enabled: false,
      start: new Date('2026-01-01T00:00:00.000Z'),
      interval: 60, // seconds; each tick continues from the saved project cursor
      concurrency: 1,
      timeout: 10, // minutes
      task: 'encryptionRotation',
      action: 'reencryptProjectSettings',
      options: { batchSize: 100, dryRun: true, afterId: null },
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
