import { RepoMigrationLog } from './RepoMigrationLog'
import { DataSourceMysql } from 'mzen-server'
import { SchemaMigrationLog } from '../schema'
import { MigrationLogEntry } from '../constructor'
import { MigrationResult } from 'mzen-migrate'

/**
 * Integration test against the real MySQL test datasource (NODE_ENV=test).
 *
 * Connects directly to the datasource (bypassing the full ModelManager boot) so the
 * unique (runId, contextKey) index genuinely executes against MySQL, the same way
 * repo.createIndexes() does in production.
 */
describe('RepoMigrationLog (MySQL integration)', () => {
  let repo: RepoMigrationLog
  let dataSource: DataSourceMysql

  beforeAll(async () => {
    jest.useRealTimers()

    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE_TEST || 'veysurRepoMigrationLogTest',
      ensureDatabase: true,
    })
    await dataSource.connect()

    repo = new RepoMigrationLog()
    repo.dataSource = dataSource
    repo.schema = new SchemaMigrationLog()
    repo.schema.addConstructors({ MigrationLogEntry })

    try {
      await repo.drop()
    } catch (error) {
      if (!error.message?.includes("doesn't exist")) {
        throw error
      }
    }

    await repo.createIndexes()
  })

  afterEach(async () => {
    await repo.deleteMany({})
  })

  afterAll(async () => {
    await dataSource.close()
    jest.useFakeTimers()
  })

  it('seedRun inserts one pending row per contextKey', async () => {
    await repo.seedRun('run1', 'project', ['projectA', 'projectB'])

    const entries = await repo.getRunEntries('run1')
    expect(entries).toHaveLength(2)
    expect(entries.every((entry) => entry.status === 'pending')).toBe(true)
    expect(entries.map((entry) => entry.contextKey).sort()).toEqual([
      'projectA',
      'projectB',
    ])
  })

  it('seedRun is idempotent — calling it again for the same run does not duplicate rows', async () => {
    await repo.seedRun('run2', 'project', ['projectA', 'projectB'])
    await repo.seedRun('run2', 'project', ['projectA', 'projectB', 'projectC'])

    const entries = await repo.getRunEntries('run2')
    expect(entries).toHaveLength(3)
    expect(entries.map((entry) => entry.contextKey).sort()).toEqual([
      'projectA',
      'projectB',
      'projectC',
    ])
  })

  it('getOutstanding excludes success rows and includes pending/running/failed', async () => {
    await repo.seedRun('run3', 'project', [
      'projectPending',
      'projectRunning',
      'projectFailed',
      'projectSuccess',
    ])

    await repo.markRunning('run3', 'projectRunning')
    await repo.markException('run3', 'projectFailed', new Error('boom'))
    await repo.markComplete(
      'run3',
      'projectSuccess',
      buildResult({ failedCount: 0 }),
    )

    const outstanding = await repo.getOutstanding('run3')
    const outstandingKeys = outstanding.map((entry) => entry.contextKey).sort()

    expect(outstandingKeys).toEqual([
      'projectFailed',
      'projectPending',
      'projectRunning',
    ])
  })

  it('markRunning sets status/startedAt and increments attempts', async () => {
    await repo.seedRun('run4', 'project', ['projectA'])

    await repo.markRunning('run4', 'projectA')
    let entry = (await repo.getRunEntries('run4'))[0]
    expect(entry.status).toBe('running')
    expect(entry.startedAt).not.toBeNull()
    expect(entry.attempts).toBe(1)

    await repo.markRunning('run4', 'projectA')
    entry = (await repo.getRunEntries('run4'))[0]
    expect(entry.attempts).toBe(2)
  })

  it('markComplete records success details from a MigrationResult with no failures', async () => {
    await repo.seedRun('run5', 'project', ['projectA'])
    await repo.markRunning('run5', 'projectA')

    const result = buildResult({
      previousVersion: '2026-01-01_0000',
      currentVersion: '2026-02-01_0000',
      totalPatches: 2,
      successCount: 2,
      failedCount: 0,
      skippedCount: 0,
      totalDuration: 1234,
      patchResults: [
        {
          version: '2026-02-01_0000',
          description: 'add index',
          dataSourceName: 'project',
          status: 'success',
          duration: 500,
          timestamp: new Date(),
        },
      ],
    })

    await repo.markComplete('run5', 'projectA', result)

    const entry = (await repo.getRunEntries('run5'))[0]
    expect(entry.status).toBe('success')
    expect(entry.previousVersion).toBe('2026-01-01_0000')
    expect(entry.currentVersion).toBe('2026-02-01_0000')
    expect(entry.duration).toBe(1234)
    expect(entry.patchResults).toHaveLength(1)
    expect(entry.patchResults[0]).toMatchObject({
      version: '2026-02-01_0000',
      status: 'success',
      error: null,
    })
  })

  it('markComplete records failure when the result has failedCount > 0, capturing the patch error', async () => {
    await repo.seedRun('run6', 'project', ['projectA'])
    await repo.markRunning('run6', 'projectA')

    const result = buildResult({
      failedCount: 1,
      successCount: 0,
      totalPatches: 1,
      patchResults: [
        {
          version: '2026-02-01_0000',
          description: 'bad patch',
          dataSourceName: 'project',
          status: 'failed',
          duration: 10,
          error: { message: 'DROP INDEX failed' },
          timestamp: new Date(),
        },
      ],
    })

    await repo.markComplete('run6', 'projectA', result)

    const entry = (await repo.getRunEntries('run6'))[0]
    expect(entry.status).toBe('failed')
    expect(entry.patchResults[0].error).toBe('DROP INDEX failed')
  })

  it('markException records a failure with no patch detail', async () => {
    await repo.seedRun('run7', 'project', ['projectA'])
    await repo.markRunning('run7', 'projectA')

    await repo.markException(
      'run7',
      'projectA',
      new Error('connection refused'),
    )

    const entry = (await repo.getRunEntries('run7'))[0]
    expect(entry.status).toBe('failed')
    expect(entry.error).toBe('connection refused')
    expect(entry.finishedAt).not.toBeNull()
  })
})

function buildResult(
  overrides: Partial<MigrationResult> = {},
): MigrationResult {
  const now = new Date()
  return {
    totalPatches: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    patchResults: [],
    previousVersion: '0000-00-00_0000',
    currentVersion: '0000-00-00_0000',
    totalDuration: 0,
    dryRun: false,
    startTime: now,
    endTime: now,
    ...overrides,
  }
}
