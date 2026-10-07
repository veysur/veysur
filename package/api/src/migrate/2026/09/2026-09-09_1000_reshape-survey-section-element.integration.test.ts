// cspell:ignore jdoc Frage Gruppe
import { DataSourceMysql } from '@datacapy/server'
import { Survey } from 'veysur-common'

import ReshapeSurveySectionElement from './2026-09-09_1000_reshape-survey-section-element'

/**
 * MySQL integration test for the group→section / question→element reshape
 * migration. Seeds a disposable database with pre-`elements`-branch-shaped rows
 * (old table names, `groupId`, embedded `welcome`/`thankYou`, old snapshot and
 * language-tree keys), runs the migration, and asserts the canonical shape —
 * including that the frozen snapshot survey loads through `new Survey()`.
 *
 * Runs only under `pnpm test:integration` (needs Docker MySQL).
 */
describe('ReshapeSurveySectionElement (MySQL integration)', () => {
  let dataSource: DataSourceMysql
  const indexed: string[] = []

  const exec = (sql: string, values?: unknown[]) =>
    dataSource.execute(sql, values)
  const insert = (table: string, jdoc: unknown) =>
    exec(`INSERT INTO \`${table}\` (\`jdoc\`) VALUES (?)`, [
      JSON.stringify(jdoc),
    ])
  const tableExists = async (name: string) => {
    const [rows] = (await exec(
      `SELECT COUNT(*) AS count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [name],
    )) as [Array<{ count: number }>]
    return rows[0].count > 0
  }
  const jdocOf = async (table: string, id: string) => {
    const [rows] = (await exec(
      `SELECT \`jdoc\` FROM \`${table}\` WHERE \`gen__id\` = ?`,
      [id],
    )) as [Array<{ jdoc: Record<string, unknown> }>]
    return rows[0]?.jdoc
  }

  const modelManager = {
    getRepo: (name: string) => ({
      getDataSource: async () => dataSource,
      releaseDataSource: () => undefined,
      createIndexes: async () => {
        indexed.push(name)
      },
    }),
  }

  const legacySurveyBody = (id: string) => ({
    _id: id,
    createdById: 'USR1',
    name: 'Legacy',
    groupIds: ['G001'],
    questionIds: ['Q001'],
    welcome: { message: { en: '<p>Hi</p>' } },
    thankYou: {
      message: { en: '<p>Bye</p>' },
      link: { url: { en: 'https://x.test' }, text: { en: 'Home' } },
    },
    content: { htmlAllowed: true },
  })

  beforeAll(async () => {
    jest.useRealTimers()
    dataSource = new DataSourceMysql({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD,
      database:
        process.env.MYSQL_DATABASE_TEST || 'veysurReshapeSectionElementTest',
      ensureDatabase: true,
    })
    await dataSource.connect()

    for (const table of [
      'surveyQuestion',
      'surveyQuestionGroup',
      'surveyElement',
      'surveySection',
      'survey',
      'surveySnapshot',
      'surveySnapshotPartial',
      'surveyLanguage',
      'surveyLanguageSnapshot',
    ]) {
      try {
        await dataSource.drop(table)
      } catch {
        /* not present */
      }
    }

    await dataSource.createTable('surveyQuestion')
    await dataSource.createTable('surveyQuestionGroup')
    await dataSource.createTable('survey')
    await dataSource.createTable('surveySnapshot')
    await dataSource.createTable('surveySnapshotPartial')
    await dataSource.createTable('surveyLanguage')
    await dataSource.createTable('surveyLanguageSnapshot')

    await insert('surveyQuestionGroup', {
      _id: 'G001',
      surveyId: 'SRV1',
      createdById: 'USR1',
      code: 'G001',
      name: { en: 'Group one' },
      questionIds: ['Q001'],
    })
    await insert('surveyQuestion', {
      _id: 'Q001',
      surveyId: 'SRV1',
      createdById: 'USR1',
      code: 'Q001',
      type: 'text',
      groupId: 'G001',
      text: { en: 'Question one' },
    })
    await insert('survey', legacySurveyBody('SRV1'))
    await insert('surveySnapshot', {
      _id: 'SNAP1',
      snapshotId: 'SNAP1',
      survey: {
        ...legacySurveyBody('SRV1'),
        groups: [
          {
            _id: 'G001',
            surveyId: 'SRV1',
            createdById: 'USR1',
            code: 'G001',
            name: { en: 'Group one' },
            questionIds: ['Q001'],
          },
        ],
        questions: [
          {
            _id: 'Q001',
            surveyId: 'SRV1',
            createdById: 'USR1',
            code: 'Q001',
            type: 'text',
            groupId: 'G001',
            text: { en: 'Question one' },
          },
        ],
      },
    })
    await insert('surveyLanguageSnapshot', {
      _id: 'LS1',
      snapshotId: 'SNAP1',
      languageCode: 'de',
      data: {
        welcomeMessage: 'Hallo',
        groups: { G001: { name: 'Gruppe' } },
        questions: { Q001: { text: 'Frage' } },
      },
    })

    await new ReshapeSurveySectionElement().update(
      modelManager as never,
      undefined as never,
    )
  })

  afterAll(async () => {
    await dataSource?.close()
  })

  it('renames the tables', async () => {
    expect(await tableExists('surveyQuestion')).toBe(false)
    expect(await tableExists('surveyQuestionGroup')).toBe(false)
    expect(await tableExists('surveyElement')).toBe(true)
    expect(await tableExists('surveySection')).toBe(true)
    expect(new Set(indexed)).toEqual(
      new Set(['surveyElement', 'surveySection']),
    )
  })

  it('rewrites element rows: sectionId + kind, no groupId', async () => {
    const el = await jdocOf('surveyElement', 'Q001')
    expect(el.sectionId).toBe('G001')
    expect(el.kind).toBe('question')
    expect(el).not.toHaveProperty('groupId')
  })

  it('rewrites section rows: kind, no questionIds', async () => {
    const section = await jdocOf('surveySection', 'G001')
    expect(section.kind).toBe('group')
    expect(section).not.toHaveProperty('questionIds')
  })

  it('rewrites the survey row and folds welcome/thank-you into section rows', async () => {
    const survey = await jdocOf('survey', 'SRV1')
    expect(survey).not.toHaveProperty('groupIds')
    expect(survey).not.toHaveProperty('welcome')
    expect(survey).not.toHaveProperty('thankYou')
    expect(survey.elementIds).toEqual(['Q001'])
    expect(survey.sectionIds).toEqual(['WELCOME', 'G001', 'THANKYOU'])
    expect(survey.contentFormat).toEqual({ htmlAllowed: true })

    const welcome = await jdocOf('surveySection', 'WELCOME')
    expect(welcome.kind).toBe('welcome')
    expect(welcome.desc).toEqual({ en: '<p>Hi</p>' })
    const thankYou = await jdocOf('surveySection', 'THANKYOU')
    expect(thankYou.config).toEqual({
      link: { url: { en: 'https://x.test' }, text: { en: 'Home' } },
    })
  })

  it('transforms the embedded snapshot survey so it loads', async () => {
    const snap = await jdocOf('surveySnapshot', 'SNAP1')
    const embedded = snap.survey as Record<string, unknown>
    expect(embedded).not.toHaveProperty('questions')
    expect(embedded).not.toHaveProperty('groups')

    const survey = new Survey(embedded)
    expect(survey.elements.length).toBeGreaterThan(0)
    expect(survey.sections.length).toBeGreaterThan(0)
    expect(survey.elements.questions()[0].sectionId).toBe('G001')
  })

  it('transforms the language snapshot data tree', async () => {
    const ls = await jdocOf('surveyLanguageSnapshot', 'LS1')
    const data = ls.data as Record<string, unknown>
    expect(data).not.toHaveProperty('groups')
    expect(data).not.toHaveProperty('questions')
    expect(data.sections).toEqual({ G001: { name: 'Gruppe' } })
    expect(data.elements).toEqual({ Q001: { text: 'Frage' } })
    expect(data.welcomeSectionDesc).toBe('Hallo')
  })

  it('is idempotent on a second run', async () => {
    const before = await jdocOf('survey', 'SRV1')
    await new ReshapeSurveySectionElement().update(
      modelManager as never,
      undefined as never,
    )
    expect(await jdocOf('survey', 'SRV1')).toEqual(before)
  })
})
