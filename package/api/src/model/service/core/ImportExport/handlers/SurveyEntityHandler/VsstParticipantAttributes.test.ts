// cspell:ignore Département
import type {
  RepoSurvey,
  RepoSurveyLanguage,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
} from 'model'
import { VsstExportCollector } from './VsstExportCollector'
import { VsstImportPersister } from './VsstImportPersister'
import type { VsstResolvedContext } from './types'
import { mockRepoTransaction } from '../../../../../../test-utils/mockRepoTransaction'

describe('VSST participant attribute round-trip', () => {
  let mockRepoSurvey: {
    findOne: jest.Mock
    getRepo: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    create: jest.Mock
    transaction: jest.Mock
  }
  let mockRepoSurveyLanguage: { find: jest.Mock }
  let mockRepoAttribute: { findOne: jest.Mock; insertOne: jest.Mock }
  let mockRepoAttributeLanguage: { find: jest.Mock; insertOne: jest.Mock }
  let collector: VsstExportCollector
  let persister: VsstImportPersister

  const surveyId = 'survey-1'
  const projectId = 'project-1'

  const SURVEY = {
    _id: surveyId,
    projectId,
    name: 'Test Survey',
    language: { default: 'en', options: ['en', 'fr'] },
    applySortOrder: () => ({
      ...SURVEY,
      sections: [],
      elements: [],
    }),
  }

  const ATTRIBUTE_DOC = {
    _id: 'attr-doc-1',
    surveyId,
    projectId,
    attributes: [
      { name: 'department', required: true, internal: false, example: 'Sales' },
      { name: 'region', required: false, internal: false, example: null },
    ],
  }

  const LANGUAGE_DOCS = [
    {
      languageCode: 'en',
      data: {
        department: { label: 'Department', description: 'Staff department' },
        region: { label: 'Region' },
      },
    },
    { languageCode: 'fr', data: { department: { label: 'Département' } } },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    const mockDataSource = {
      transactionStart: jest.fn(),
      transactionCommit: jest.fn(),
      transactionRollback: jest.fn(),
    }
    // transactionStart() now returns the lease to run the transaction against - self-reference
    // it here since these mocks don't model the real per-caller lease split.
    mockDataSource.transactionStart.mockResolvedValue(mockDataSource)

    mockRepoSurvey = {
      findOne: jest.fn().mockResolvedValue(SURVEY),
      getRepo: jest
        .fn()
        .mockReturnValue({ find: jest.fn().mockResolvedValue([]) }),
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      create: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(),
    }
    mockRepoSurvey.transaction = mockRepoTransaction(mockRepoSurvey)
    mockRepoSurveyLanguage = { find: jest.fn().mockResolvedValue([]) }
    mockRepoAttribute = {
      findOne: jest.fn().mockResolvedValue(ATTRIBUTE_DOC),
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    mockRepoAttributeLanguage = {
      find: jest.fn().mockResolvedValue(LANGUAGE_DOCS),
      insertOne: jest.fn().mockResolvedValue(undefined),
    }

    collector = new VsstExportCollector(
      mockRepoSurvey as unknown as RepoSurvey,
      mockRepoSurveyLanguage as unknown as RepoSurveyLanguage,
      undefined,
      undefined,
      mockRepoAttribute as unknown as RepoSurveyParticipantAttribute,
      mockRepoAttributeLanguage as unknown as RepoSurveyParticipantAttributeLanguage,
    )

    persister = new VsstImportPersister(
      mockRepoSurvey as unknown as RepoSurvey,
      undefined,
      undefined,
      undefined,
      mockRepoAttribute as unknown as RepoSurveyParticipantAttribute,
      mockRepoAttributeLanguage as unknown as RepoSurveyParticipantAttributeLanguage,
    )
  })

  test('export collector gathers participant attributes with language data', async () => {
    const result = await collector.collect(surveyId, {
      projectId,
      aclConditions: { projectAdmin: [projectId] },
      aclContext: {},
    })

    expect(result.participantAttributes).toHaveLength(2)

    const departmentAttr = result.participantAttributes.find(
      (a) => a.name === 'department',
    )
    expect(departmentAttr).toMatchObject({
      name: 'department',
      required: true,
      example: 'Sales',
    })
    expect(departmentAttr.languages.en).toEqual({
      label: 'Department',
      description: 'Staff department',
    })
    expect(departmentAttr.languages.fr).toEqual({ label: 'Département' })

    const region = result.participantAttributes.find((a) => a.name === 'region')
    expect(region.languages.en).toEqual({ label: 'Region' })
  })

  test('export includes internal attributes', async () => {
    mockRepoAttribute.findOne.mockResolvedValue({
      ...ATTRIBUTE_DOC,
      attributes: [
        {
          name: 'department',
          required: true,
          internal: false,
          example: 'Sales',
        },
        {
          name: 'internalNote',
          required: false,
          internal: true,
          example: null,
        },
      ],
    })

    const result = await collector.collect(surveyId, {
      projectId,
      aclConditions: { projectAdmin: [projectId] },
      aclContext: {},
    })

    expect(result.participantAttributes).toHaveLength(2)
    expect(result.participantAttributes.map((a) => a.name)).toContain(
      'department',
    )
    expect(result.participantAttributes.map((a) => a.name)).toContain(
      'internalNote',
    )
  })

  test('persister inserts one attribute doc and one language doc per language code', async () => {
    const resolvedContext = {
      survey: { _id: 'new-survey-1' },
      sections: [],
      elements: [],
      surveyLanguages: [],
      embeddedFileEntries: [],
      parsedData: {},
      fileResolutions: [],
      imageSetIdMap: {},
      participantAttributes: [
        {
          surveyId: 'new-survey-1',
          name: 'department',
          required: true,
          example: 'Sales',
          languages: {
            en: { label: 'Department', description: 'Staff department' },
            fr: { label: 'Département' },
          },
        },
        {
          surveyId: 'new-survey-1',
          name: 'region',
          required: false,
          example: null,
          languages: {
            en: { label: 'Region' },
          },
        },
      ],
    }

    await persister.persist(resolvedContext as unknown as VsstResolvedContext, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoAttribute.insertOne).toHaveBeenCalledTimes(1)
    const attrDoc = mockRepoAttribute.insertOne.mock.calls[0][0]
    expect(attrDoc.surveyId).toBe('new-survey-1')
    expect(attrDoc.attributes).toHaveLength(2)
    expect(attrDoc.attributes[0].name).toBe('department')
    expect(attrDoc.attributes[1].name).toBe('region')

    expect(mockRepoAttributeLanguage.insertOne).toHaveBeenCalledTimes(2)
    const langCalls = mockRepoAttributeLanguage.insertOne.mock.calls.map(
      (c) => c[0],
    )
    const enDoc = langCalls.find((d) => d.languageCode === 'en')
    const frDoc = langCalls.find((d) => d.languageCode === 'fr')
    expect(enDoc.data).toMatchObject({
      department: { label: 'Department' },
      region: { label: 'Region' },
    })
    expect(frDoc.data).toMatchObject({ department: { label: 'Département' } })
  })

  test('persister skips language records with no label or description', async () => {
    const resolvedContext = {
      survey: { _id: 'new-survey-1' },
      sections: [],
      elements: [],
      surveyLanguages: [],
      embeddedFileEntries: [],
      parsedData: {},
      fileResolutions: [],
      imageSetIdMap: {},
      participantAttributes: [
        {
          surveyId: 'new-survey-1',
          name: 'department',
          required: false,
          example: null,
          languages: {
            en: {},
          },
        },
      ],
    }

    await persister.persist(resolvedContext as unknown as VsstResolvedContext, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoAttribute.insertOne).toHaveBeenCalledTimes(1)
    expect(mockRepoAttributeLanguage.insertOne).not.toHaveBeenCalled()
  })
})
