// cspell:ignore Merci répondre Bonjour
import type { RepoEmailTemplate, RepoSurvey } from 'model'
import { VsstExportCollector } from './VsstExportCollector'
import { VsstImportPersister } from './VsstImportPersister'
import type { VsstResolvedContext } from './types'
import { mockRepoTransaction } from '../../../../../../test-utils/mockRepoTransaction'

describe('VSST email template round-trip', () => {
  let mockRepoSurvey: {
    findOne: jest.Mock
    getRepo: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    create: jest.Mock
    transaction: jest.Mock
  }
  let mockRepoEmailTemplate: {
    find: jest.Mock
    findOne: jest.Mock
    updateOne: jest.Mock
    create: jest.Mock
  }
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

  const TEMPLATE_DOCS = [
    {
      type: 'invite',
      lang: 'en',
      subject: 'Please take our survey',
      body: '<p>Hi</p>',
    },
    {
      type: 'invite',
      lang: 'fr',
      subject: 'Merci de répondre',
      body: '<p>Bonjour</p>',
    },
    { type: 'reminder', lang: 'en', subject: '', body: '' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    const mockDataSource = {
      transactionStart: jest.fn(),
      transactionCommit: jest.fn(),
      transactionRollback: jest.fn(),
    }
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

    mockRepoEmailTemplate = {
      find: jest.fn().mockResolvedValue(TEMPLATE_DOCS),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    }

    collector = new VsstExportCollector(
      mockRepoSurvey as unknown as RepoSurvey,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mockRepoEmailTemplate as unknown as RepoEmailTemplate,
    )

    persister = new VsstImportPersister(
      mockRepoSurvey as unknown as RepoSurvey,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      mockRepoEmailTemplate as unknown as RepoEmailTemplate,
    )
  })

  test('export collector gathers email templates, filtering out empty ones', async () => {
    const result = await collector.collect(surveyId, {
      projectId,
      aclConditions: { projectAdmin: [projectId] },
      aclContext: {},
    })

    expect(result.emailTemplates).toHaveLength(2)
    expect(result.emailTemplates.map((t) => `${t.type}-${t.lang}`)).toEqual([
      'invite-en',
      'invite-fr',
    ])
  })

  test('export collector returns empty array when no repo is provided', async () => {
    const collectorWithoutTemplates = new VsstExportCollector(
      mockRepoSurvey as unknown as RepoSurvey,
    )

    const result = await collectorWithoutTemplates.collect(surveyId, {
      projectId,
      aclConditions: { projectAdmin: [projectId] },
      aclContext: {},
    })

    expect(result.emailTemplates).toEqual([])
  })

  test('persister creates a new template when none exists (no collision)', async () => {
    const resolvedContext = {
      survey: { _id: 'new-survey-1' },
      sections: [],
      elements: [],
      surveyLanguages: [],
      participantAttributes: [],
      embeddedFileEntries: [],
      parsedData: {},
      fileResolutions: [],
      imageSetIdMap: {},
      emailTemplates: [
        {
          surveyId: 'new-survey-1',
          type: 'invite',
          lang: 'en',
          subject: 'Please take our survey',
          body: '<p>Hi</p>',
        },
      ],
    }

    await persister.persist(resolvedContext as unknown as VsstResolvedContext, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoEmailTemplate.findOne).toHaveBeenCalledWith(
      { surveyId: 'new-survey-1', type: 'invite', lang: 'en' },
      expect.anything(),
    )
    expect(mockRepoEmailTemplate.create).toHaveBeenCalledTimes(1)
    expect(mockRepoEmailTemplate.updateOne).not.toHaveBeenCalled()
    const created = mockRepoEmailTemplate.create.mock.calls[0][0]
    expect(created).toMatchObject({
      surveyId: 'new-survey-1',
      type: 'invite',
      lang: 'en',
      subject: 'Please take our survey',
    })
  })

  test('persister overwrites an existing template on collision (upsert)', async () => {
    mockRepoEmailTemplate.findOne.mockResolvedValue({
      _id: 'existing-template',
      surveyId: 'new-survey-1',
      type: 'invite',
      lang: 'en',
      subject: 'Old subject',
      body: '<p>Old</p>',
    })

    const resolvedContext = {
      survey: { _id: 'new-survey-1' },
      sections: [],
      elements: [],
      surveyLanguages: [],
      participantAttributes: [],
      embeddedFileEntries: [],
      parsedData: {},
      fileResolutions: [],
      imageSetIdMap: {},
      emailTemplates: [
        {
          surveyId: 'new-survey-1',
          type: 'invite',
          lang: 'en',
          subject: 'New subject',
          body: '<p>New</p>',
        },
      ],
    }

    await persister.persist(resolvedContext as unknown as VsstResolvedContext, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoEmailTemplate.create).not.toHaveBeenCalled()
    expect(mockRepoEmailTemplate.updateOne).toHaveBeenCalledTimes(1)
    const [filter, update] = mockRepoEmailTemplate.updateOne.mock.calls[0]
    expect(filter).toEqual({
      surveyId: 'new-survey-1',
      type: 'invite',
      lang: 'en',
    })
    expect(update.$set).toMatchObject({
      subject: 'New subject',
      body: '<p>New</p>',
    })
  })

  test('persister writes templates after the survey transaction commits', async () => {
    const resolvedContext = {
      survey: { _id: 'new-survey-1' },
      sections: [],
      elements: [],
      surveyLanguages: [],
      participantAttributes: [],
      embeddedFileEntries: [],
      parsedData: {},
      fileResolutions: [],
      imageSetIdMap: {},
      emailTemplates: [
        {
          surveyId: 'new-survey-1',
          type: 'invite',
          lang: 'en',
          subject: 'Please take our survey',
          body: '<p>Hi</p>',
        },
      ],
    }

    await persister.persist(resolvedContext as unknown as VsstResolvedContext, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    const transactionCallOrder =
      mockRepoSurvey.transaction.mock.invocationCallOrder[0]
    const findOneCallOrder =
      mockRepoEmailTemplate.findOne.mock.invocationCallOrder[0]
    expect(findOneCallOrder).toBeGreaterThan(transactionCallOrder)
  })

  test('persister is a no-op when no templates are provided', async () => {
    const resolvedContext = {
      survey: { _id: 'new-survey-1' },
      sections: [],
      elements: [],
      surveyLanguages: [],
      participantAttributes: [],
      embeddedFileEntries: [],
      parsedData: {},
      fileResolutions: [],
      imageSetIdMap: {},
      emailTemplates: [],
    }

    await persister.persist(resolvedContext as unknown as VsstResolvedContext, {
      projectId,
      aclContext: { jwt: { _id: 'user-1' } },
    })

    expect(mockRepoEmailTemplate.findOne).not.toHaveBeenCalled()
    expect(mockRepoEmailTemplate.create).not.toHaveBeenCalled()
  })
})
