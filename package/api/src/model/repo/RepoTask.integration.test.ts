import { RepoTask } from './RepoTask'
import { DataSourceMysql } from 'mzen-server'
import { SchemaTask } from 'veysur-common/model/schema'
import { Task } from 'veysur-common'

/**
 * Integration test against the real MySQL test datasource (NODE_ENV=test).
 *
 * This is a regression test for a bug where the `enabled` index's `backedOffUntil` field had
 * no `typeHint`, so mzen-om's MySQL adapter generated the `gen_backedOffUntil` column as
 * VARCHAR (via JSON_VALUE, no STR_TO_DATE cast) instead of a proper temporal type. A
 * VARCHAR-typed column compares lexicographically, not chronologically - the JSON-serialised
 * stored value uses a `T` separator ("2026-07-29T09:00:00.000Z") while the bound query
 * parameter uses a space ("2026-07-29 14:23:11"). Since `T` (0x54) sorts after a space (0x20),
 * any same-calendar-day `backedOffUntil` in the past was judged "greater than" `now` by string
 * comparison, making `findDueTasks()`'s `$lte: now` query invisible to the task for the rest of
 * that UTC day.
 *
 * Runs against a dedicated, disposable test database (not the shared dev `veysurAccount`
 * database, which carries real seeded scheduler tasks) so the `task` table only ever contains
 * rows this suite controls. Connects directly to the datasource (bypassing the full
 * ModelManager boot, which pulls in unrelated services) so the index/generated-column DDL
 * genuinely executes against MySQL, the same way `repo.createIndexes()` does in production.
 */
describe('RepoTask (MySQL integration)', () => {
  let repo: RepoTask
  let dataSource: DataSourceMysql
  const testTaskIds: string[] = []

  beforeAll(async () => {
    // The Jest config enables fake timers globally, which stalls mysql2's real network I/O
    // (connection/query timeouts rely on real `setTimeout`). This suite talks to a real
    // datasource, so it needs real timers for the duration of these tests.
    jest.useRealTimers()

    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE_TEST || 'veysurRepoTaskTest',
      ensureDatabase: true,
    })
    await dataSource.connect()

    repo = new RepoTask()
    repo.dataSource = dataSource
    // Wire the real schema directly (ModelManager normally does this via addSchemas()) so
    // `find()`/`findOne()` cast `start`/`backedOffUntil`/etc. back to Date instances.
    repo.schema = new SchemaTask()
    repo.schema.addConstructors({ Task })

    // Start from a clean table each run so a stale generated column from a previous/aborted
    // run can never survive - `createIndex()` skips (re)creating a generated column that
    // already exists, so this drop is what guarantees the DDL genuinely runs fresh.
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
    if (testTaskIds.length) {
      await repo.deleteMany({ _id: { $in: [...testTaskIds] } })
      testTaskIds.length = 0
    }
  })

  afterAll(async () => {
    await dataSource.close()
    jest.useFakeTimers()
  })

  it('creates the enabled index with a temporally-typed gen_backedOffUntil column', async () => {
    const columnType = await dataSource.execute?.(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'task' AND COLUMN_NAME = 'gen_backedOffUntil'`,
    )
    const [rows] = columnType as [Array<{ DATA_TYPE: string }>, unknown]
    expect(rows).toHaveLength(1)
    // TYPE_HINT_TIMESTAMP maps to SQL TIMESTAMP - the point under test is that it is no longer
    // VARCHAR (which is what a missing typeHint produced, causing lexicographic comparisons).
    expect(rows[0]?.DATA_TYPE).toBe('timestamp')
  })

  it('findDueTasks returns a same-calendar-day past-due task but not a future one', async () => {
    const now = new Date()

    // Same UTC calendar day as `now`, but earlier - the exact scenario that exposed the bug.
    // Any time on the same day reproduces it: the VARCHAR comparison fails on the `T` vs space
    // separator at a fixed character position, regardless of the actual hour.
    const pastSameDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        1,
        0,
      ),
    )
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Generated `_id` columns are fixed CHAR(17) (base62 BSON ObjectId sizing), so test ids
    // must stay within that limit.
    const suffix = Date.now().toString(36)
    const pastTaskId = `rtP${suffix}`
    const futureTaskId = `rtF${suffix}`
    testTaskIds.push(pastTaskId, futureTaskId)

    const baseTask = {
      description: '',
      start: now,
      interval: 60,
      concurrency: 1,
      timeout: 10,
      task: 'ping',
      action: 'ping',
      options: {},
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastRunAt: null,
      lastScheduledAt: null,
      createdAt: now,
      updatedAt: now,
    }

    await repo.insertOne({
      ...baseTask,
      _id: pastTaskId,
      name: pastTaskId,
      enabled: true,
      backedOffUntil: pastSameDay,
    })

    await repo.insertOne({
      ...baseTask,
      _id: futureTaskId,
      name: futureTaskId,
      enabled: true,
      backedOffUntil: future,
    })

    const dueTasks = await repo.findDueTasks()
    const dueIds = dueTasks.map((task) => task._id)

    expect(dueIds).toContain(pastTaskId)
    expect(dueIds).not.toContain(futureTaskId)
  })

  describe('updateBackoff', () => {
    const now = new Date()
    const baseTask = {
      description: '',
      start: now,
      interval: 60,
      concurrency: 1,
      timeout: 10,
      action: 'run',
      options: {},
      consecutiveFailures: 5,
      lastFailureAt: now,
      lastRunAt: null,
      lastScheduledAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    }

    it('holds any task enabled and capped at 24h from the 6th failure on — never disables', async () => {
      const id = `rtBd${Date.now().toString(36)}`
      testTaskIds.push(id)
      await repo.insertOne({
        ...baseTask,
        _id: id,
        name: id,
        enabled: true,
        task: 'fx',
      })

      await repo.updateBackoff(id)

      const after = await repo.findOne({ _id: id })
      expect(after?.consecutiveFailures).toBe(6)
      expect(after?.enabled).toBe(true)
      expect(after?.backedOffUntil).not.toBeNull()
      expect(after!.backedOffUntil!.getTime()).toBeGreaterThan(
        Date.now() + 20 * 60 * 60 * 1000,
      )
    })

    it('walks the exponential schedule 5m → 15m → 1h → 6h → 24h then holds', async () => {
      const id = `rtBs${Date.now().toString(36)}`
      testTaskIds.push(id)
      await repo.insertOne({
        ...baseTask,
        _id: id,
        name: id,
        enabled: true,
        task: 'fx',
        consecutiveFailures: 0,
      })

      const expectedMinutes = [5, 15, 60, 6 * 60, 24 * 60, 24 * 60]
      for (let i = 0; i < expectedMinutes.length; i++) {
        const before = Date.now()
        await repo.updateBackoff(id)
        const after = await repo.findOne({ _id: id })
        expect(after?.consecutiveFailures).toBe(i + 1)
        const deltaMinutes = (after!.backedOffUntil!.getTime() - before) / 60000
        expect(deltaMinutes).toBeGreaterThan(expectedMinutes[i] - 1)
        expect(deltaMinutes).toBeLessThan(expectedMinutes[i] + 1)
      }
    })

    it('never writes enable state — a manually disabled task stays disabled', async () => {
      const id = `rtBx${Date.now().toString(36)}`
      testTaskIds.push(id)
      await repo.insertOne({
        ...baseTask,
        _id: id,
        name: id,
        enabled: false,
        task: 'fx',
      })

      await repo.updateBackoff(id)

      const after = await repo.findOne({ _id: id })
      expect(after?.enabled).toBe(false)
    })
  })

  describe('staleSinceAt', () => {
    const now = new Date()
    const baseTask = {
      description: '',
      start: now,
      interval: 60,
      concurrency: 1,
      timeout: 10,
      task: 'ping',
      action: 'run',
      options: {},
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastRunAt: null,
      lastScheduledAt: null,
      backedOffUntil: null,
      createdAt: now,
      updatedAt: now,
    }

    it('setStaleSinceAt sets and clears the marker; setLastRunAt clears it', async () => {
      const id = `rtSs${Date.now().toString(36)}`
      testTaskIds.push(id)
      await repo.insertOne({ ...baseTask, _id: id, name: id, enabled: true })

      await repo.setStaleSinceAt(id, now)
      expect((await repo.findOne({ _id: id }))?.staleSinceAt).not.toBeNull()

      await repo.setStaleSinceAt(id, null)
      expect((await repo.findOne({ _id: id }))?.staleSinceAt).toBeNull()

      await repo.setStaleSinceAt(id, now)
      await repo.setLastRunAt(id, new Date(), new Date())
      expect((await repo.findOne({ _id: id }))?.staleSinceAt).toBeNull()
    })
  })
})
