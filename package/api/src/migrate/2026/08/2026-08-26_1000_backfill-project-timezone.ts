import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'

/**
 * Backfill the timezone field onto Project documents created before it was
 * added to SchemaProject. New rows get the schema default ('UTC') on
 * insert, but @datacapy/om/MySQL do not retroactively apply schema defaults to
 * already-persisted rows, so existing projects are backfilled explicitly.
 */
export default class BackfillProjectTimezone implements DatabasePatchInterface {
  version = '2026-08-26_1000'
  description = 'Backfill timezone (UTC) onto existing project documents'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    // Self-hosted has no 'project' repo at all (single, config-sourced Project —
    // see model/service/ServiceProject.ts) — nothing to backfill on a fresh
    // install; only an extension's own RepoProject applies.
    const repo = modelManager.getRepo('project')
    if (!repo) {
      console.log(
        '✓ No project repository in this deployment, skipping backfill\n',
      )
      return
    }

    const projects = (await repo.find({})) as {
      _id: string
      timezone?: string
    }[]

    let updated = 0
    for (const project of projects) {
      if (project.timezone) continue

      await repo.updateOne({ _id: project._id }, { $set: { timezone: 'UTC' } })
      updated++
    }

    console.log(
      `✓ Backfill complete: ${updated} project(s) set to timezone 'UTC', ${projects.length - updated} already had it\n`,
    )
  }
}
