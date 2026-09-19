import { RepoEmail } from './RepoEmail'
import { DataSourceMysql } from 'mzen-server'

/**
 * Integration test against the real MySQL test datasource (NODE_ENV=test).
 *
 * Regression test for a bug in `save()`'s update branch: it called
 * `this.updateOne(email, { _id: email._id })`, but `Repo.updateOne(filter, update, options)`
 * takes filter first - so the whole `email` document was passed as the *filter* and
 * `{ _id: ... }` as the *update*, which mzen-om rejects ("Unsupported operator: _id",
 * since update documents must use $set/$inc/etc). This branch was never exercised by the
 * old synchronous send-only flow (every call went through the insert branch, since a
 * fresh `Email` object never had `_id` set) - it only started running once
 * `ServiceEmail.processQueue()` began calling `send()` against an already-persisted
 * pending row loaded with its `_id` intact.
 *
 * Runs against a dedicated, disposable test database (not the shared dev `veysurAccount`
 * database) so the `email` table only ever contains rows this suite controls.
 */
describe('RepoEmail (MySQL integration)', () => {
  let repo: RepoEmail
  let dataSource: DataSourceMysql
  const testEmailIds: string[] = []

  beforeAll(async () => {
    jest.useRealTimers()

    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE_TEST || 'veysurRepoEmailTest',
      ensureDatabase: true,
    })
    await dataSource.connect()

    repo = new RepoEmail()
    repo.dataSource = dataSource

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
    if (testEmailIds.length) {
      await repo.deleteMany({ _id: { $in: [...testEmailIds] } })
      testEmailIds.length = 0
    }
  })

  afterAll(async () => {
    await dataSource.close()
    jest.useFakeTimers()
  })

  it('save() updates an already-persisted row in place rather than throwing', async () => {
    const suffix = Date.now().toString(36)
    const id = `re${suffix}`
    testEmailIds.push(id)

    await repo.insertOne({
      _id: id,
      service: 'queued',
      type: 'invite',
      to: 'jane@example.com',
      from: 'support@veysur.local',
      subject: 'Hi',
      status: 'pending',
    })

    const loaded = await repo.findOne({ _id: id })
    expect(loaded).not.toBeNull()

    // Simulate ServiceEmail.send() dispatching an already-queued row: mutate the loaded
    // (already-`_id`-bearing) document and save it again - this must go through the
    // update branch, not throw "Unsupported operator: _id".
    await expect(
      repo.save({ ...loaded, status: 'sent', sent: new Date() } as never),
    ).resolves.not.toThrow()

    const updated = await repo.findOne({ _id: id })
    expect(updated?.status).toBe('sent')
    expect(updated?.sent).toBeInstanceOf(Date)
  })

  it('save() inserts a new row when _id is not yet set', async () => {
    // insertOne()'s QueryPersistResult.id is the raw MySQL insertId (meaningless here -
    // these JSON-document tables have no auto-increment column); the schema generates the
    // real _id internally on a clone that is never handed back to the caller. So look the
    // row up by a distinguishing field instead of relying on the insert result's id.
    await repo.save({
      service: 'queued',
      type: 'invite',
      to: 'new@example.com',
      from: 'support@veysur.local',
      subject: 'Hi',
      status: 'pending',
    } as never)

    const loaded = await repo.findOne({ to: 'new@example.com' })
    expect(loaded).not.toBeNull()
    expect(loaded?.status).toBe('pending')
    if (loaded?._id) testEmailIds.push(loaded._id)
  })
})
