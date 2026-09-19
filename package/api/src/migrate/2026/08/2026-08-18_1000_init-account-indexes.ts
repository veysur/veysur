import { DatabasePatchInterface } from 'mzen-migrate'
import { ModelManager } from 'mzen-om'

/**
 * Initialize database indexes for all 'account' datasource repositories
 * not covered by their own dedicated migration.
 */
export default class InitAccountIndexes implements DatabasePatchInterface {
  version = '2026-08-18_1000'
  description = 'Initialize database indexes for all account repositories'
  dataSourceName = 'account'

  async update(modelManager: ModelManager): Promise<void> {
    const dbRepoNames = [
      'email',
      'fxRate',
      'payment',
      'paymentMethod',
      'project',
      'projectAdmin',
      'projectSubscription',
      'subscriptionPlan',
      'user',
      'userClient',
      'task',
      'taskExecution',
      'taskLock',
      'eventLogSystem',
      'supportTicketMeta',
      'supportTicket',
      'vatValidation',
      'emailSuppression',
      'projectUsageHistory',
    ]

    console.log('\nCreating indexes for account datasource repositories...')

    for (const repoName of dbRepoNames) {
      try {
        const repo = modelManager.getRepo(repoName)

        if (!repo) {
          console.warn(`⚠ Repository "${repoName}" not found, skipping...`)
          continue
        }

        console.log(`  Creating indexes for ${repoName}...`)
        await repo.createIndexes()
        console.log(`  ✓ Indexes created for ${repoName}`)
      } catch (error) {
        // MongoDB's createIndex is idempotent for identical indexes
        // So we can gracefully handle cases where indexes already exist
        if (
          error instanceof Error &&
          (error.message.includes('already exists') ||
            error.message.includes('Index with name') ||
            error.message.includes('Duplicate key name'))
        ) {
          console.log(
            `  ⚠ Some indexes for ${repoName} already exist, continuing...`,
          )
        } else {
          console.error(`  ✗ Error creating indexes for ${repoName}:`, error)
          throw error
        }
      }
    }

    console.log('✓ All account database indexes initialized successfully\n')
  }
}
