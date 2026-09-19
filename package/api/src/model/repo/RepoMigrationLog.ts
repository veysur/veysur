import { Repo, ServerErrorBadRequest, TYPE_HINT_TIMESTAMP } from 'mzen-server'
import { genUniqueId } from 'mzen-id'
import { MigrationResult } from 'mzen-migrate'

import { MigrationLogEntry, MigrationLogPatchResult } from '../constructor'

/**
 * Repository for MigrationLogEntry entities
 *
 * Tracks the progress of a batch migration run (one CLI invocation) across every
 * target database it touches. This is a run/job ledger, not a per-database version
 * store — mzen-migrate's own migrationMeta table (inside each target database) remains
 * the canonical record of which patches have been applied. migrationLog only answers
 * "what happened to this database in this run", so a later `--resume <runId>` can skip
 * already-successful databases and retry the rest, concurrently.
 */
export class RepoMigrationLog extends Repo<MigrationLogEntry> {
  constructor() {
    super({
      name: 'migrationLog',
      autoIndex: false,
      relations: {},
      indexes: {
        runIdContextKey: {
          spec: { runId: 1, contextKey: 1 },
          options: { unique: true },
        },
        runIdStatus: {
          spec: { runId: 1, status: 1 },
        },
        createdAt: {
          spec: { createdAt: -1 },
          options: { typeHint: TYPE_HINT_TIMESTAMP },
        },
      },
    })
  }

  /**
   * Seed one pending row per contextKey for a run. Safe to call again for the same
   * runId — contextKeys that already have a row (from a previous seed or a prior
   * attempt) are left untouched.
   */
  async seedRun(
    runId: string,
    dataSourceName: string,
    contextKeys: string[],
  ): Promise<void> {
    const existing = await this.find({ runId })
    const existingContextKeys = new Set(
      existing.map((entry) => entry.contextKey),
    )
    const newContextKeys = contextKeys.filter(
      (contextKey) => !existingContextKeys.has(contextKey),
    )

    if (newContextKeys.length === 0) return

    const entries: MigrationLogEntry[] = []
    for (const contextKey of newContextKeys) {
      const entryData: Partial<MigrationLogEntry> = {
        _id: genUniqueId(),
        runId,
        dataSourceName,
        contextKey,
        status: 'pending',
        createdAt: new Date(),
      }

      const { isValid, errors } = await this.schema.validatePaths(entryData)
      if (!isValid) {
        throw new ServerErrorBadRequest(errors)
      }

      await this.schema.applyFilters(entryData)
      entries.push(new MigrationLogEntry(entryData))
    }

    await this.insertMany(entries)
  }

  /**
   * All rows for a run, in seed order.
   */
  async getRunEntries(runId: string): Promise<MigrationLogEntry[]> {
    return this.find({ runId }, { sort: { createdAt: 1 } })
  }

  /**
   * Rows that still need to run: never attempted, failed, or left 'running' by a
   * process that crashed before finalising. Since migrationMeta is idempotent per
   * patch/version, retrying a stale 'running' row is safe.
   */
  async getOutstanding(runId: string): Promise<MigrationLogEntry[]> {
    return this.find(
      { runId, status: { $ne: 'success' } },
      { sort: { createdAt: 1 } },
    )
  }

  async markRunning(runId: string, contextKey: string): Promise<void> {
    await this.updateOne(
      { runId, contextKey },
      {
        $set: { status: 'running', startedAt: new Date() },
        $inc: { attempts: 1 },
      },
    )
  }

  /**
   * Record the outcome of a completed migrate() call (success or partial failure).
   */
  async markComplete(
    runId: string,
    contextKey: string,
    result: MigrationResult,
  ): Promise<void> {
    const patchResults: MigrationLogPatchResult[] = result.patchResults.map(
      (patch) => ({
        version: patch.version,
        description: patch.description,
        status: patch.status,
        duration: patch.duration,
        error: patch.error?.message ?? null,
      }),
    )

    await this.updateOne(
      { runId, contextKey },
      {
        $set: {
          status: result.failedCount > 0 ? 'failed' : 'success',
          previousVersion: result.previousVersion,
          currentVersion: result.currentVersion,
          totalPatches: result.totalPatches,
          successCount: result.successCount,
          failedCount: result.failedCount,
          skippedCount: result.skippedCount,
          patchResults,
          duration: result.totalDuration,
          finishedAt: result.endTime,
        },
      },
    )
  }

  /**
   * Record a hard failure where migrate() itself threw (e.g. could not connect to
   * the target database) rather than returning a MigrationResult.
   */
  async markException(
    runId: string,
    contextKey: string,
    error: unknown,
  ): Promise<void> {
    await this.updateOne(
      { runId, contextKey },
      {
        $set: {
          status: 'failed',
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      },
    )
  }
}

export default RepoMigrationLog
