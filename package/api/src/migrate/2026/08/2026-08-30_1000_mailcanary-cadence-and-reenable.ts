import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'

/**
 * T3.3: the mail deliverability canary was seeded at a 6-hour interval and could
 * be permanently auto-disabled after 6 failures — it stayed dark for days in the
 * 2026-08 outage. Bring existing rows in line with the updated seed: run every
 * 10 minutes, and clear any auto-disabled / backed-off state so it resumes.
 * (RepoTask.updateBackoff now caps every task at 24h instead of disabling it
 * — see 2026-08-30_1200 — so this only needs to run once.)
 */
export default class MailCanaryCadenceAndReenable implements DatabasePatchInterface {
  version = '2026-08-30_1000'
  description = 'Mail canary: 10-minute interval, clear disabled/backoff state'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    const task = (await repo.findOne({
      task: 'mailCanary',
      action: 'run',
    })) as { _id: string; interval?: number } | null

    if (!task) {
      console.log('⚠ No mailCanary task found, skipping\n')
      return
    }

    await repo.updateOne(
      { _id: task._id },
      {
        $set: {
          interval: 600,
          timeout: 8,
          enabled: true,
          consecutiveFailures: 0,
          backedOffUntil: null,
          lastFailureAt: null,
          updatedAt: new Date(),
        },
      },
    )

    console.log(
      '✓ Mail canary updated: interval 600s, re-enabled, backoff cleared\n',
    )
  }
}
