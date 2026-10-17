// cspell:ignore jdoc
import { DataSourceMysql } from '@datacapy/server'

import RemoveCaptchaRegResumeSettings from './2026-10-17_1100_remove-captcha-reg-resume-settings'

/**
 * MySQL integration test for the `access.captchaReg` and `access.captchaResume` removal. Seeds a
 * disposable database, runs the migration and asserts the key is gone from
 * every table that can carry it while other data is left alone.
 *
 * Runs only under `pnpm test:integration` (needs Docker MySQL).
 */
describe('RemoveCaptchaRegResumeSettings (MySQL integration)', () => {
  let dataSource: DataSourceMysql

  const exec = (sql: string, values?: unknown[]) =>
    dataSource.execute(sql, values)
  const insert = (table: string, jdoc: unknown) =>
    exec(`INSERT INTO \`${table}\` (\`jdoc\`) VALUES (?)`, [
      JSON.stringify(jdoc),
    ])
  const jdocOf = async (table: string, id: string) => {
    const [rows] = (await exec(
      `SELECT \`jdoc\` FROM \`${table}\` WHERE \`gen__id\` = ?`,
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
    new RemoveCaptchaRegResumeSettings().update(
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
        process.env.MYSQL_DATABASE_TEST || 'veysurRemoveCaptchaRegResumeTest',
      ensureDatabase: true,
    })
    await dataSource.connect()

    // surveySnapshotPartial is left out to cover a project database without it
    for (const table of [
      'settingSurvey',
      'survey',
      'surveySnapshot',
      'surveySnapshotPartial',
    ]) {
      try {
        await dataSource.drop(table)
      } catch {
        /* not present */
      }
    }
    for (const table of ['settingSurvey', 'survey', 'surveySnapshot']) {
      await dataSource.createTable(table)
    }

    await insert('settingSurvey', {
      _id: 'SET1',
      access: { captchaReg: true, captchaResume: false, open: true },
    })
    await insert('settingSurvey', { _id: 'SET2', access: { open: false } })
    await insert('survey', {
      _id: 'SRV1',
      access: { captchaResume: null, index: true },
    })
    await insert('survey', { _id: 'SRV2', name: 'No access block' })
    await insert('surveySnapshot', {
      _id: 'SNAP1',
      survey: { _id: 'SRV1', access: { captchaReg: false, open: true } },
    })
  })

  afterAll(async () => {
    await dataSource?.close()
  })

  it('removes the key wherever it is set and keeps other fields', async () => {
    await run()

    expect(await jdocOf('settingSurvey', 'SET1')).toEqual({
      _id: 'SET1',
      access: { open: true },
    })
    expect(await jdocOf('survey', 'SRV1')).toEqual({
      _id: 'SRV1',
      access: { index: true },
    })
    expect(await jdocOf('surveySnapshot', 'SNAP1')).toEqual({
      _id: 'SNAP1',
      survey: { _id: 'SRV1', access: { open: true } },
    })
  })

  it('leaves rows without the key unchanged', async () => {
    expect(await jdocOf('settingSurvey', 'SET2')).toEqual({
      _id: 'SET2',
      access: { open: false },
    })
    expect(await jdocOf('survey', 'SRV2')).toEqual({
      _id: 'SRV2',
      name: 'No access block',
    })
  })

  it('is idempotent on a second run', async () => {
    const before = await jdocOf('surveySnapshot', 'SNAP1')
    await run()
    expect(await jdocOf('surveySnapshot', 'SNAP1')).toEqual(before)
  })
})
