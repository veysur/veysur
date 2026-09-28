import type { RepoSurvey } from 'model'
import { Survey, L10n } from 'veysur-common'

import { MarkdownFormatHandler } from '../../format/MarkdownFormatHandler'
import { SurveyEntityHandler } from '../SurveyEntityHandler'
import { mockRepoTransaction } from '../../../../../../test-utils/mockRepoTransaction'

/**
 * End-to-end confirmation that the markdown pipeline holds together through
 * the same SurveyEntityHandler entry points real requests use: export a live
 * Survey to markdown, then parse -> validate -> persist it back, asserting
 * the entities passed to the repos are structurally equal to the original
 * (modulo _id/timestamps, which are expected to differ on a fresh import).
 */
describe('SurveyEntityHandler — markdown format round trip', () => {
  const projectId = 'project-1'
  const aclContext = { jwt: { _id: 'user-1' } } as never

  let mockRepoSurvey: {
    getRepo: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    create: jest.Mock
    findOne: jest.Mock
    transaction: jest.Mock
  }
  let insertedSections: unknown[]
  let insertedElements: unknown[]
  let handler: SurveyEntityHandler

  beforeEach(() => {
    insertedSections = []
    insertedElements = []

    const mockDataSource = {
      transactionStart: jest.fn(),
      transactionCommit: jest.fn(),
      transactionRollback: jest.fn(),
    }
    mockDataSource.transactionStart.mockResolvedValue(mockDataSource)

    const mockRepoSection = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn(async (section: unknown) => {
        insertedSections.push(section)
      }),
    }
    const mockRepoElement = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn(async (element: unknown) => {
        insertedElements.push(element)
      }),
    }

    mockRepoSurvey = {
      getRepo: jest.fn((name: string) =>
        name === 'surveySection' ? mockRepoSection : mockRepoElement,
      ),
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      create: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(null), // no survey-id collision
      transaction: jest.fn(),
    }
    mockRepoSurvey.transaction = mockRepoTransaction(mockRepoSurvey)

    handler = new SurveyEntityHandler(mockRepoSurvey as unknown as RepoSurvey)
  })

  test('Example E round-trips through prepareExportData -> parseImportData -> validateImport -> persistImport', async () => {
    const survey = new Survey({
      title: { en: 'Customer Satisfaction Survey' },
      language: { default: 'en', options: ['en'] },
      sectionIds: ['section-1'],
      elementIds: ['c1', 'q1', 'q2'],
      sections: [{ _id: 'section-1', kind: 'group', name: { en: 'General' } }],
      elements: [
        {
          _id: 'c1',
          kind: 'content',
          code: 'C001',
          type: 'contentText',
          sectionId: 'section-1',
          text: {
            en: 'Thank you for taking the time to complete this survey.',
          },
        },
        {
          _id: 'q1',
          kind: 'question',
          code: 'Q001',
          type: 'yesNo',
          sectionId: 'section-1',
          text: { en: 'Would you recommend us to a friend?' },
        },
        {
          _id: 'q2',
          kind: 'question',
          code: 'Q002',
          type: 'checkbox',
          sectionId: 'section-1',
          text: { en: 'Which features do you use?' },
          attributes: { choiceOther: true },
          answerOptions: [
            { code: 'A001', label: new L10n({ en: 'Reporting' }) },
            { code: 'A002', label: new L10n({ en: 'Dashboards' }) },
          ],
        },
      ],
    })

    const formatHandler = new MarkdownFormatHandler()

    const exportStream = await handler.prepareExportData(
      { survey },
      formatHandler,
    )
    const parsed = await handler.parseImportData(exportStream, formatHandler)

    const validation = await handler.validateImport(parsed, {
      projectId,
      aclContext,
    })
    expect(validation.valid).toBe(true)

    const result = await handler.persistImport(validation.data, {
      projectId,
      aclContext,
    })

    expect(typeof result.entityId).toBe('string')
    expect(insertedSections).toHaveLength(1)
    expect(insertedElements).toHaveLength(3)

    const persistedSection = insertedSections[0] as { name: L10n; kind: string }
    expect(persistedSection.kind).toBe('group')
    expect(persistedSection.name.en).toBe('General')

    const byCode = (code: string) =>
      insertedElements.find((e) => (e as { code: string }).code === code) as {
        code: string
        kind: string
        type: string
        text: L10n
        attributes?: Record<string, unknown>
        answerOptions?: { code: string; label: L10n }[]
      }

    const c1 = byCode('C001')
    expect(c1.kind).toBe('content')
    expect(c1.type).toBe('contentText')
    expect(c1.text.en).toBe(
      'Thank you for taking the time to complete this survey.',
    )

    const q1 = byCode('Q001')
    expect(q1.kind).toBe('question')
    expect(q1.type).toBe('yesNo')
    expect(q1.text.en).toBe('Would you recommend us to a friend?')

    const q2 = byCode('Q002')
    expect(q2.type).toBe('checkbox')
    expect(q2.attributes?.choiceOther).toBe(true)
    expect(
      q2.answerOptions?.map((o) => ({ code: o.code, label: o.label.en })),
    ).toEqual([
      { code: 'A001', label: 'Reporting' },
      { code: 'A002', label: 'Dashboards' },
    ])

    // Fresh import always gets new ids, distinct from the original in-memory survey.
    expect(insertedElements.map((e) => (e as { _id: string })._id)).not.toEqual(
      ['c1', 'q1', 'q2'],
    )
  })
})
