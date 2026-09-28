import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'

/**
 * RepoDataTransferJob and RepoNotification both set `autoIndex: false` (like
 * every other account-datasource repo) but were never added to
 * `2026-08-18_1000_init-account-indexes.ts`'s `dbRepoNames` list, so their
 * declared indexes were never actually created - queries against them fall
 * back to a full-table `JSON_VALUE` scan (see
 * `external/mzen/package/mzen-om/docs/mysql-indexes.md`). Same backfill
 * pattern as `2026-09-17_1000_init-project-indexes.ts`.
 */
export default class InitDataTransferJobAndNotificationIndexes
  implements DatabasePatchInterface
{
  version = '2026-09-24_1300'
  description =
    'Initialize database indexes for the dataTransferJob and notification repositories'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    for (const repoName of ['dataTransferJob', 'notification']) {
      const repo = modelManager.getRepo(repoName)
      if (!repo) {
        console.log(`✓ No ${repoName} repository in this deployment, skipping\n`)
        continue
      }

      try {
        await repo.createIndexes()
        console.log(`✓ Indexes created for ${repoName}\n`)
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`⚠ ${repoName} indexes already exist, continuing...\n`)
          continue
        }
        throw error
      }
    }
  }
}
