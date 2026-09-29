import { DatabasePatchInterface } from '@datacapy/migrate'
import { ModelManager } from '@datacapy/om'

/**
 * Self-hosted gained a persisted `project` repo (previously the single
 * project was synthesized in memory from config, with no `RepoProject` at
 * all — see `model/service/ServiceProject.ts`). `2026-08-18_1000` already
 * lists 'project' among the account-datasource repos it indexes, but that
 * migration already ran (as a graceful no-op skip) on every existing
 * self-hosted install before this repo existed, so it won't re-run to pick
 * this up. This migration creates the indexes for installs upgrading from
 * before the repo existed; a fresh install gets them from the repo's own
 * `createIndexes()` the first time indexes are initialized.
 */
export default class InitProjectIndexes implements DatabasePatchInterface {
  version = '2026-09-17_1000'
  description = 'Initialize database indexes for the project repository'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const repo = modelManager.getRepo('project')
    if (!repo) {
      console.log('✓ No project repository in this deployment, skipping\n')
      return
    }

    try {
      await repo.createIndexes()
      console.log('✓ Indexes created for project\n')
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('⚠ Project indexes already exist, continuing...\n')
        return
      }
      throw error
    }
  }
}
