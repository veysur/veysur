/**
 * MigrationLogPatchResult
 * Detail of a single migration patch's execution, embedded in a MigrationLogEntry
 */
export interface MigrationLogPatchResult {
  version: string
  description: string
  status: 'success' | 'failed' | 'skipped'
  duration: number
  error: string | null
}

/**
 * MigrationLogEntry Constructor
 * Tracks the progress of migrating a single database (account or project) within a
 * batch migration run. Distinct from @datacapy/migrate's own migrationMeta table, which
 * lives inside each target database and is the canonical record of applied patches —
 * this is a run/job ledger spanning multiple databases in one CLI invocation.
 */
export class MigrationLogEntry {
  _id: string
  runId: string
  dataSourceName: string // 'account' | 'project'
  contextKey: string // 'account' for the static datasource, projectId for dynamic
  status: 'pending' | 'running' | 'success' | 'failed'
  attempts: number
  previousVersion: string | null // db version before this attempt
  currentVersion: string | null // db version after this attempt
  totalPatches: number
  successCount: number
  failedCount: number
  skippedCount: number
  patchResults: MigrationLogPatchResult[]
  duration: number | null // ms
  startedAt: Date | null
  finishedAt: Date | null
  error: string | null // top-level failure (e.g. connection error before any patch ran)
  createdAt: Date

  constructor(data: Partial<MigrationLogEntry> = {}) {
    this._id = data._id || ''
    this.runId = data.runId || ''
    this.dataSourceName = data.dataSourceName || ''
    this.contextKey = data.contextKey || ''
    this.status = data.status || 'pending'
    this.attempts = data.attempts || 0
    this.previousVersion = data.previousVersion || null
    this.currentVersion = data.currentVersion || null
    this.totalPatches = data.totalPatches || 0
    this.successCount = data.successCount || 0
    this.failedCount = data.failedCount || 0
    this.skippedCount = data.skippedCount || 0
    this.patchResults = data.patchResults || []
    this.duration = data.duration || null
    this.startedAt = data.startedAt || null
    this.finishedAt = data.finishedAt || null
    this.error = data.error || null
    this.createdAt = data.createdAt || new Date()
  }
}
