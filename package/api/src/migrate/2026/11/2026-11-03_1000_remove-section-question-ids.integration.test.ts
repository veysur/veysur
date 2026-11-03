// cspell:ignore jdoc
import { DataSourceMysql } from '@datacapy/server'

import RemoveSectionQuestionIds from './2026-11-03_1000_remove-section-question-ids'

/**
 * MySQL integration test for the section `questionIds` removal. Runs only
 * under `pnpm test:integration` (needs Docker MySQL).
 */
describe('RemoveSectionQuestionIds (MySQL integration)', () => {
  let dataSource: DataSourceMysql

  const exec = (sql: string, values?: unknown[]) =>
    dataSource.execute(sql, values)
  const insert = (jdoc: unknown) =>
    exec('INSERT INTO `surveySection` (`jdoc`) VALUES (?)', [
      JSON.stringify(jdoc),
    ])
  const jdocOf = async (id: string) => {
    const [rows] = (await exec(
      'SELECT `jdoc` FROM `surveySection` WHERE `gen__id` = ?',
      [id],
    )) as [Array<{ jdoc: Record<string, unknown> }>]
    return rows[0]?.jdoc
  }

  const modelManager = {
    getRepo: () => ({
      getDataSource: async () => dataSource,
      releaseDataSource: () => undefined,
    }),
  }
  const run = () =>
    new RemoveSectionQuestionIds().update(
      modelManager as never,
      undefined as never,
    )

  beforeAll(async () => {
    jest.useRealTimers()
    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database:
        process.env.MYSQL_DATABASE_TEST || 'veysurRemoveSectionQuestionIdsTest',
      ensureDatabase: true,
    })
    await dataSource.connect()
    try {
      await dataSource.drop('surveySection')
    } catch {
      /* not present */
    }
    await dataSource.createTable('surveySection')

    await insert({ _id: 'S1', code: 'G001', kind: 'group', questionIds: [] })
    await insert({
      _id: 'S2',
      code: 'G002',
      kind: 'group',
      questionIds: ['q1'],
    })
    await insert({ _id: 'S3', code: 'WELCOME', kind: 'welcome' })
  })

  afterAll(async () => {
    await dataSource?.close()
  })

  it('removes questionIds and keeps other fields', async () => {
    await run()

    expect(await jdocOf('S1')).toEqual({
      _id: 'S1',
      code: 'G001',
      kind: 'group',
    })
    expect(await jdocOf('S2')).toEqual({
      _id: 'S2',
      code: 'G002',
      kind: 'group',
    })
  })

  it('leaves rows without the key unchanged', async () => {
    expect(await jdocOf('S3')).toEqual({
      _id: 'S3',
      code: 'WELCOME',
      kind: 'welcome',
    })
  })

  it('is idempotent on a second run', async () => {
    const before = await jdocOf('S1')
    await run()
    expect(await jdocOf('S1')).toEqual(before)
  })
})
