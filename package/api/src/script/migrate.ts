#!/usr/bin/env tsx

import * as path from 'path'
import { MigrationManager, MigrationResult } from '@datacapy/migrate'
import { genUniqueId } from '@datacapy/id'

import { composition, modelManager } from 'model-manager'
import { RepoMigrationLog } from 'model/repo'

interface CliArgs {
  dryRun: boolean
  verbose: boolean
  targetVersion?: string
  datasource: string
  context?: Record<string, string>
  contextLookup?: string
  concurrency: number
  resumeRunId?: string
}

/**
 * One database to migrate within this invocation, paired with the migrationLog
 * contextKey used to track its progress.
 */
interface ContextJob {
  contextKey: string
  context?: Record<string, string>
}

/**
 * Parse command-line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2)

  const cliArgs: CliArgs = {
    dryRun: false,
    verbose: false,
    datasource: 'account', // Default to 'account' datasource
    concurrency: 1,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--dry-run') {
      cliArgs.dryRun = true
    } else if (arg === '--verbose' || arg === '-v') {
      cliArgs.verbose = true
    } else if (arg === '--target-version') {
      cliArgs.targetVersion = args[++i]
    } else if (arg === '--datasource' || arg === '-d') {
      cliArgs.datasource = args[++i]
    } else if (arg === '--context') {
      const contextArg = args[++i]
      if (!contextArg) {
        console.error('Error: --context requires a key=value argument')
        process.exit(1)
      }

      const [key, value] = contextArg.split('=')
      if (!key || !value) {
        console.error(
          `Error: Invalid context format: "${contextArg}". Expected format: key=value`,
        )
        process.exit(1)
      }

      if (!cliArgs.context) {
        cliArgs.context = {}
      }
      cliArgs.context[key] = value
    } else if (arg === '--context-lookup') {
      cliArgs.contextLookup = args[++i]
    } else if (arg === '--concurrency') {
      const n = parseInt(args[++i], 10)
      if (isNaN(n) || n < 1) {
        console.error('Error: --concurrency must be a positive integer')
        process.exit(1)
      }
      cliArgs.concurrency = n
    } else if (arg === '--resume') {
      cliArgs.resumeRunId = args[++i]
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return cliArgs
}

/**
 * Print help text
 */
function printHelp(): void {
  console.log(`
Usage: npm run migrate [options]

Options:
  --dry-run              Preview migrations without applying them
  --verbose, -v          Enable verbose logging
  --target-version <v>   Migrate to specific version (default: latest)
  --datasource, -d <ds>  Target datasource name (default: account)
  --context <key=value>  Context for dynamic datasources (can be specified multiple times)
  --context-lookup <p>   Lookup pattern for batch migrations (e.g., "*" for all projects)
  --concurrency <n>      Max parallel database migrations (default: 1)
  --resume <runId>       Resume a previous run, retrying only outstanding databases
                         (works at any concurrency). The run ID is printed at the
                         start and end of every invocation — see docs/database-migrations.md.
  --help, -h             Show this help message

Examples:
  npm run migrate                    # Run all pending migrations
  npm run migrate:dry-run            # Preview migrations
  npm run migrate -- --verbose       # Run with verbose output
  npm run migrate -- --target-version 2026-02-05_1000  # Migrate to specific version
  npm run migrate -- --datasource project --context-lookup "*" --concurrency 5  # Migrate all projects
  npm run migrate -- --resume <runId> --concurrency 5  # Retry outstanding databases from a previous run
`)
}

/**
 * Print migration summary for a single, non-batch migration (dry run or otherwise)
 */
function printSummary(result: MigrationResult): void {
  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(60))

  if (result.dryRun) {
    console.log('Mode:             DRY RUN (no changes applied)')
  }

  console.log(`Previous version: ${result.previousVersion}`)
  console.log(`Current version:  ${result.currentVersion}`)
  console.log(`Total patches:    ${result.totalPatches}`)
  console.log(`Successful:       ${result.successCount}`)
  console.log(`Failed:           ${result.failedCount}`)
  console.log(`Skipped:          ${result.skippedCount}`)
  console.log(`Duration:         ${result.totalDuration}ms`)

  if (result.patchResults && result.patchResults.length > 0) {
    console.log('\nPATCH DETAILS:')
    for (const patch of result.patchResults) {
      const status =
        patch.status === 'success' ? '✓' : patch.status === 'failed' ? '✗' : '⊘'
      console.log(
        `  ${status} ${patch.version} - ${patch.description} (${patch.duration}ms)`,
      )

      if (patch.error) {
        console.log(`    Error: ${patch.error.message}`)
      }
    }
  }

  console.log('='.repeat(60) + '\n')

  if (result.failedCount > 0) {
    console.log('❌ Migration completed with errors')
  } else if (result.totalPatches === 0) {
    console.log('✓ Database is up to date')
  } else {
    console.log('✓ Migration completed successfully')
  }
}

/**
 * Extract the contextKey used to identify a database in migrationLog: 'account' for
 * the static datasource, otherwise the projectId (or first context value).
 */
function contextKeyFor(
  datasource: string,
  context?: Record<string, string>,
): string {
  if (datasource !== 'project') return 'account'
  return context?.projectId ?? Object.values(context ?? {})[0] ?? 'unknown'
}

/**
 * Resolve the full list of databases to migrate in this invocation, either by
 * expanding --context-lookup, taking the single --context/--datasource target, or (for
 * --resume) reading back the outstanding rows from a previous run's migrationLog.
 */
async function resolveContexts(
  cliArgs: CliArgs,
  repoMigrationLog: RepoMigrationLog,
): Promise<{ runId: string | null; contexts: ContextJob[] }> {
  if (cliArgs.resumeRunId) {
    const runId = cliArgs.resumeRunId
    const allEntries = await repoMigrationLog.getRunEntries(runId)
    if (allEntries.length === 0) {
      console.error(`Error: --resume run ID "${runId}" not found`)
      await modelManager.shutdown()
      process.exit(1)
    }

    const outstanding = await repoMigrationLog.getOutstanding(runId)
    console.log(
      `Resuming run ${runId}: ${outstanding.length} of ${allEntries.length} database(s) outstanding`,
    )

    const contexts = outstanding.map((entry) => ({
      contextKey: entry.contextKey,
      context:
        entry.dataSourceName === 'project'
          ? { projectId: entry.contextKey }
          : undefined,
    }))

    return { runId, contexts }
  }

  if (cliArgs.contextLookup) {
    if (!composition.migrate) {
      console.error(
        'Error: --context-lookup requires a per-project ' +
          'database topology, which self-hosted does not have (a single ' +
          'database, no dynamic "project" datasource to look up). Omit ' +
          '--context-lookup and target --datasource/--context directly.',
      )
      await modelManager.shutdown()
      process.exit(1)
    }

    const { ContextResolverProject } = composition.migrate
    const accountDataSource = modelManager.getDataSource('account')
    const contextResolver = new ContextResolverProject(accountDataSource)
    const resolved = await contextResolver.resolve(cliArgs.contextLookup)

    const contexts = resolved.map((context) => ({
      contextKey: contextKeyFor(cliArgs.datasource, context),
      context,
    }))

    return { runId: null, contexts }
  }

  return {
    runId: null,
    contexts: [
      {
        contextKey: contextKeyFor(cliArgs.datasource, cliArgs.context),
        context: cliArgs.context,
      },
    ],
  }
}

/**
 * Merge a follow-up MigrationResult into a base one (core pass + platform pass).
 * Counts and patch details accumulate; version bookkeeping stays with the base
 * (core) pass since the two passes track versions in separate meta tables.
 */
function mergeResults(
  base: MigrationResult,
  extra: MigrationResult,
): MigrationResult {
  return {
    ...base,
    totalPatches: base.totalPatches + extra.totalPatches,
    successCount: base.successCount + extra.successCount,
    failedCount: base.failedCount + extra.failedCount,
    skippedCount: base.skippedCount + extra.skippedCount,
    patchResults: [...base.patchResults, ...extra.patchResults],
    totalDuration: base.totalDuration + extra.totalDuration,
    endTime: extra.endTime,
  }
}

/**
 * Run one database's migration against the given base MigrationManager config.
 *
 * When a composition module is configured, a second pass runs over whatever
 * patch directory and meta table the resolved `composition.migrate` names (see
 * `model-manager.ts`) — those patches cover data owned by the extension, whose
 * repos and `task:` services are absent from a self-hosted deployment. `--datasource project` never
 * carries platform migrations, so the second pass is account-only.
 */
async function runOne(
  baseConfig: ConstructorParameters<typeof MigrationManager>[0],
  job: ContextJob,
): Promise<MigrationResult> {
  const manager = new MigrationManager({ ...baseConfig, context: job.context })
  const result = await manager.migrate()

  const runPlatform = !!composition.migrate && baseConfig.dataSourceName === 'account'
  if (!runPlatform) return result

  const platformManager = new MigrationManager({
    ...baseConfig,
    context: job.context,
    patchDirectory: composition.migrate.patchDirectory,
    metaTableName: composition.migrate.metaTableName,
  })
  return mergeResults(result, await platformManager.migrate())
}

/**
 * Main migration execution
 */
async function main(): Promise<void> {
  try {
    // Parse CLI arguments
    const cliArgs = parseArgs()

    // Initialize ModelManager
    console.log('Initializing model manager...')
    await modelManager.init()

    // ModelManager.getRepo<T>() is generic over the entity type, not the repo subclass,
    // so it returns the base Repo<MigrationLogEntry> type — downcast to recover the
    // custom methods (seedRun/markRunning/etc.) that the registered instance actually has.
    const repoMigrationLog = modelManager.getRepo(
      'migrationLog',
    ) as RepoMigrationLog

    // Configure MigrationManager
    const patchDirectory = path.resolve(__dirname, '../migrate')

    console.log(`Datasource:       ${cliArgs.datasource}`)
    console.log(`Patch directory:  ${patchDirectory}`)
    console.log(`Target version:   ${cliArgs.targetVersion || 'latest'}`)
    console.log('')

    const baseConfig = {
      modelManager,
      patchDirectory,
      dataSourceName: cliArgs.datasource,
      metaTableName: 'migrationMeta',
      targetVersion: cliArgs.targetVersion || 'latest',
      dryRun: cliArgs.dryRun,
      verbose: cliArgs.verbose,
      stopOnError: true,
    }

    const { runId: resolvedRunId, contexts } = await resolveContexts(
      cliArgs,
      repoMigrationLog,
    )

    if (contexts.length === 0) {
      console.log(`No contexts found for pattern "${cliArgs.contextLookup}"`)
      await modelManager.shutdown()
      process.exit(0)
    }

    // Dry runs are a preview only — never touch migrationLog
    if (cliArgs.dryRun) {
      for (const job of contexts) {
        const result = await runOne(baseConfig, job)
        printSummary(result)
      }
      await modelManager.shutdown()
      process.exit(0)
    }

    // A fresh (non-resumed) run gets a new runId and seeds migrationLog up front so
    // --resume <runId> is available even if this invocation is interrupted before finishing
    const runId = resolvedRunId ?? genUniqueId()
    if (!resolvedRunId) {
      await repoMigrationLog.seedRun(
        runId,
        cliArgs.datasource,
        contexts.map((job) => job.contextKey),
      )
    }

    console.log(`Run ID:           ${runId}`)
    console.log(
      `Databases:        ${contexts.length} (concurrency ${cliArgs.concurrency})`,
    )
    console.log('')

    let totalSuccess = 0
    let totalFailed = 0
    let totalSkipped = 0
    const failures: string[] = []

    for (let i = 0; i < contexts.length; i += cliArgs.concurrency) {
      const chunk = contexts.slice(i, i + cliArgs.concurrency)
      await Promise.all(
        chunk.map(async (job) => {
          await repoMigrationLog.markRunning(runId, job.contextKey)

          try {
            const result = await runOne(baseConfig, job)
            await repoMigrationLog.markComplete(runId, job.contextKey, result)

            totalSuccess += result.successCount
            totalFailed += result.failedCount
            totalSkipped += result.skippedCount

            if (result.failedCount > 0) {
              failures.push(job.contextKey)
            } else {
              console.log(
                `✓ ${job.contextKey} migrated successfully (${result.successCount} patches applied)`,
              )
            }
          } catch (error) {
            await repoMigrationLog.markException(runId, job.contextKey, error)
            totalFailed++
            failures.push(
              `${job.contextKey}: ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }),
      )
    }

    console.log('\n=== Migration Run Summary ===')
    console.log(`Run ID:          ${runId}`)
    console.log(`Databases:       ${contexts.length}`)
    console.log(`Patches applied: ${totalSuccess}`)
    console.log(`Patches failed:  ${totalFailed}`)
    console.log(`Patches skipped: ${totalSkipped}`)

    if (failures.length > 0) {
      console.log('\nFailed databases:')
      failures.forEach((f) => console.log(`  ✗ ${f}`))
      console.log('\nTo retry only the outstanding databases, run:')
      console.log(
        `  pnpm run migrate -- --resume ${runId}` +
          (cliArgs.concurrency > 1
            ? ` --concurrency ${cliArgs.concurrency}`
            : ''),
      )
    }

    // Shutdown model manager
    await modelManager.shutdown()

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0)
  } catch (error) {
    console.error('Migration failed:', error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }

    // Attempt to shutdown model manager
    try {
      await modelManager.shutdown()
    } catch (shutdownError) {
      console.error('Error during shutdown:', shutdownError)
    }

    process.exit(1)
  }
}

// Run migration
main()
