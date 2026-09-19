import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'

/**
 * `Task.failOnErrorCount` replaces the hardcoded `MAIL_PIPELINE_TASK_NAMES` list
 * that used to gate "treat a run resolving with `{ errors|failed > 0 }` as a
 * failed execution". Backfill it `true` for the three mail-pipeline tasks whose
 * actions report internal errors via their return shape rather than throwing.
 * Idempotent — skips rows that already have it set.
 */
export default class TaskFailOnErrorCount implements DatabasePatchInterface {
  version = '2026-08-30_1300'
  description = 'Backfill Task.failOnErrorCount for the mail-pipeline tasks'
  dataSourceName = 'account'

  private readonly taskNames = ['email', 'emailBounceProcessor', 'mailCanary']

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('task')
    if (!repo) throw new Error('Task repository not found')

    let updated = 0
    let skipped = 0

    for (const taskName of this.taskNames) {
      const rows = (await repo.find({ task: taskName })) as Array<{
        _id: string
        name?: string
        failOnErrorCount?: boolean
      }>

      if (rows.length === 0) {
        console.log(`⚠ No '${taskName}' task found, skipping`)
        continue
      }

      for (const row of rows) {
        if (row.failOnErrorCount === true) {
          skipped++
          continue
        }
        await repo.updateOne(
          { _id: row._id },
          { $set: { failOnErrorCount: true, updatedAt: new Date() } },
        )
        console.log(`✓ Set failOnErrorCount on task: ${row.name ?? row._id}`)
        updated++
      }
    }

    console.log(
      `✓ Backfill complete: ${updated} task(s) updated, ${skipped} already set\n`,
    )
  }
}
