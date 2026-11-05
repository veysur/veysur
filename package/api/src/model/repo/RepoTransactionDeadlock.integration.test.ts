import { RepoTask } from './RepoTask'
import { DataSourceMysql } from '@datacapy/server'
import { DataSourceContext } from '@datacapy/om'
import { SchemaTask, Task } from 'veysur-common/server'

/**
 * Regression test for publish 500s under concurrency: InnoDB picks one of two transactions that
 * lock the same rows in opposite order as a deadlock victim (errno 1213). `Repo.transaction()`
 * must re-run the victim instead of surfacing a 500.
 *
 * Runs against the throwaway MySQL started by `pnpm test:integration`.
 */
describe('Repo.transaction deadlock retry (MySQL integration)', () => {
  let repo: RepoTask
  let dataSource: DataSourceMysql
  const ids = ['deadlockTaskA0001', 'deadlockTaskB0001']

  beforeAll(async () => {
    jest.useRealTimers()
    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE_TEST || 'veysurTxDeadlockTest',
      ensureDatabase: true,
    })
    await dataSource.connect()

    repo = new RepoTask()
    repo.dataSource = dataSource
    // transaction() binds its lease under the repo's datasource name; RepoTask has none by default.
    repo.config.dataSource = 'default'
    repo.schema = new SchemaTask()
    repo.schema.addConstructors({ Task })
    repo.setLogger({
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as never)
  })

  beforeEach(async () => {
    await repo.deleteMany({ _id: { $in: ids } }).catch(() => undefined)
    for (const [index, _id] of ids.entries()) {
      await repo.insertOne(
        new Task({ _id, name: `deadlock-${index}`, interval: 60 }) as never,
      )
    }
  })

  afterAll(async () => {
    await repo.deleteMany({ _id: { $in: ids } })
    await dataSource.close()
    jest.useFakeTimers()
  })

  /**
   * Two transactions that each update one row and, once both hold their first lock, update the
   * other's. The barrier only applies to a transaction's first run so a retry cannot block.
   */
  function runCrossingTransactions(options?: { maxAttempts?: number }) {
    let arrived = 0
    let release: () => void
    const bothArrived = new Promise<void>((resolve) => (release = resolve))
    const runs = [0, 0]

    const worker = (first: string, second: string, slot: number) =>
      repo.transaction(
        new DataSourceContext(),
        async (context) => {
          runs[slot] += 1
          await repo.updateOne(
            { _id: first },
            { $set: { notes: `w${slot}` } } as never,
            { context },
          )
          if (runs[slot] === 1) {
            arrived += 1
            if (arrived === 2) release()
            await bothArrived
          }
          await repo.updateOne(
            { _id: second },
            { $set: { notes: `w${slot}` } } as never,
            { context },
          )
        },
        { backoffMs: [20 * (slot + 1)], ...options },
      )

    return {
      runs,
      results: Promise.allSettled([
        worker(ids[0], ids[1], 0),
        worker(ids[1], ids[0], 1),
      ]),
    }
  }

  it('retries the deadlock victim so both transactions succeed', async () => {
    const { runs, results } = runCrossingTransactions()
    const settled = await results

    expect(settled.map((s) => s.status)).toEqual(['fulfilled', 'fulfilled'])
    expect(runs[0] + runs[1]).toBe(3)
  }, 30000)

  it('surfaces errno 1213 when retry is disabled', async () => {
    const { results } = runCrossingTransactions({ maxAttempts: 1 })
    const settled = await results
    const rejected = settled.filter((s) => s.status === 'rejected')

    expect(rejected).toHaveLength(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      errno: 1213,
    })
  }, 30000)
})
