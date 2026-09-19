import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'

/**
 * Task auto-disable has been removed: every task now holds at the 24h backoff
 * cap and keeps retrying (ServiceTaskManager escalates to BugSink) until the
 * underlying issue is fixed or an operator disables it by hand. Re-enable any
 * task still sitting `enabled: false` from the old 6-failure auto-disable
 * behaviour and clear its failure/backoff state so it resumes on the next tick.
 * The `task-failing` / `task-persistently-failing` alerts resurface anything
 * still genuinely broken. Naturally idempotent — a no-op once no disabled rows
 * remain. Generalises the mailCanary-specific re-enable in
 * 2026-08-30_1000_mailcanary-cadence-and-reenable.ts.
 */
export default class ReenableAutoDisabledTasks implements DatabasePatchInterface {
  version = '2026-08-30_1200'
  description = 'Re-enable tasks left disabled by the removed auto-disable path'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const disabled = (await repo.find({ enabled: false })) as Array<{
      _id: string
      name?: string
    }>

    for (const task of disabled) {
      await repo.updateOne(
        { _id: task._id },
        {
          $set: {
            enabled: true,
            consecutiveFailures: 0,
            lastFailureAt: null,
            backedOffUntil: null,
            updatedAt: new Date(),
          },
        },
      )
      console.log(`✓ Re-enabled task: ${task.name ?? task._id}`)
    }

    console.log(`✓ Re-enable complete: ${disabled.length} task(s) re-enabled\n`)
  }
}
