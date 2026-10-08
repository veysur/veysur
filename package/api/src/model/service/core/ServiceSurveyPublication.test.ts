import { Survey, SettingSurvey } from 'veysur-common'
import {
  SurveyElementCollection,
  SurveyQuestion,
  SurveySectionCollection,
  SurveySection,
} from 'veysur-common/model/constructor'
import { ServicePublication } from './ServiceSurveyPublication'
import { mockRepoTransaction } from '../../../test-utils/mockRepoTransaction'

// cspell:ignore settingsurvey

jest.mock('model', () => ({}))

// Skip survey content validation — not what this test exercises
jest.mock('veysur-common', () => {
  const actual = jest.requireActual('veysur-common')
  return {
    ...actual,
    SurveyValidation: jest.fn().mockImplementation(() => ({
      validate: jest.fn().mockResolvedValue({ isValid: true, errors: [] }),
    })),
  }
})

const makeSettingSurvey = () =>
  new SettingSurvey({
    _id: 'settings-1',
    language: { default: 'en', options: ['en'] },
    access: {
      anonymous: false,
      open: false,
      publicReg: false,
      index: false,
      tokenPersist: true,
      multiple: false,
      repeatCookie: false,
      resumeLink: false,
      captcha: false,
      captchaReg: false,
      captchaResume: false,
      embed: false,
      embedDomains: [],
    },
    presentation: {
      format: 'group',
      noAnswer: true,
      title: false,
      welcomeMessage: true,
      progressBar: true,
      questionCount: true,
      groupName: false,
      groupDesc: false,
      questionNum: false,
      questionCode: false,
      questionIndex: false,
      backNav: false,
      redirectEnd: false,
      thankYouLink: false,
      navDelay: 0,
      print: false,
      stats: false,
      noBrand: false,
    },
    participant: { htmlEmail: true, thankYouEmail: true, tokenLength: 16 },
    data: {
      timestamp: false,
      ip: false,
      anonymiseIp: false,
      referrerUrl: false,
      timings: false,
      assessment: false,
    },
  })

const makeSurvey = () =>
  new Survey({
    _id: 'survey-1',
    name: 'Test Survey',
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    // All settings left as null — should fall back to project defaults on publishPrep
    access: {
      anonymous: null,
      open: null,
      publicReg: true, // explicitly set on the survey
      index: null,
      tokenPersist: null,
      multiple: null,
      repeatCookie: null,
      resumeLink: null,
      captcha: null,
      captchaReg: null,
      captchaResume: null,
    },
    presentation: {
      format: null,
      noAnswer: null,
      title: null,
      welcomeMessage: null,
      progressBar: null,
      questionCount: null,
      groupName: null,
      groupDesc: null,
      questionNum: null,
      questionCode: null,
      questionIndex: null,
      backNav: null,
      redirectEnd: null,
      navDelay: null,
      print: null,
      stats: null,
    },
    participant: { htmlEmail: null, thankYouEmail: null, tokenLength: null },
    data: {
      timestamp: null,
      ip: null,
      anonymiseIp: null,
      referrerUrl: null,
      timings: null,
      assessment: null,
    },
    language: { default: 'en', options: ['en'] },
    sections: [],
    elements: [],
    sectionIds: [],
    elementIds: [],
  })

describe('ServicePublication.publish — snapshot settings resolution', () => {
  let service: ServicePublication
  let snapshotInsertCapture: { survey: Survey } | null
  let survey: Survey
  let settingSurvey: SettingSurvey
  let mockEmbedRefresh: jest.Mock

  const mockDataSource: {
    transactionStart: jest.Mock
    transactionCommit: jest.Mock
    transactionRollback: jest.Mock
  } = {
    transactionStart: jest.fn(),
    transactionCommit: jest.fn().mockResolvedValue(undefined),
    transactionRollback: jest.fn().mockResolvedValue(undefined),
  }
  // transactionStart() now returns the lease to run the transaction against - self-reference
  // it here since these mocks don't model the real per-caller lease split.
  mockDataSource.transactionStart.mockResolvedValue(mockDataSource)

  beforeEach(() => {
    jest.clearAllMocks()
    snapshotInsertCapture = null

    service = new ServicePublication()

    survey = makeSurvey()
    settingSurvey = makeSettingSurvey()

    const repoSurvey = {
      findOne: jest.fn().mockResolvedValue(survey),
    }
    const repoSettingSurvey = {
      findOne: jest.fn().mockResolvedValue(settingSurvey),
    }
    const repoSurveyLanguage = {
      find: jest.fn().mockResolvedValue([]),
    }
    const repoSurveyLanguageSnapshot = {
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveyParticipantAttribute = {
      findOne: jest.fn().mockResolvedValue(null),
    }
    const repoSurveyParticipantAttributeLanguage = {
      find: jest.fn().mockResolvedValue([]),
    }
    const repoSurveyParticipantAttributeSnapshot = {
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveyParticipantAttributeLanguageSnapshot = {
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveySnapshotPartial = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue(undefined),
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      transaction: jest.fn(),
    }
    repoSurveySnapshotPartial.transaction = mockRepoTransaction(
      repoSurveySnapshotPartial,
    )
    const repoSurveySnapshot = {
      insertOne: jest.fn().mockImplementation((data) => {
        snapshotInsertCapture = data
        return Promise.resolve(undefined)
      }),
    }
    const repoSurveyPublication = {
      updateMany: jest.fn().mockResolvedValue(undefined),
      insertOne: jest.fn().mockResolvedValue(undefined),
    }
    const repoFile = {
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        survey: repoSurvey,
        settingSurvey: repoSettingSurvey,
        surveyLanguage: repoSurveyLanguage,
        surveyLanguageSnapshot: repoSurveyLanguageSnapshot,
        surveyParticipantAttribute: repoSurveyParticipantAttribute,
        surveyParticipantAttributeLanguage:
          repoSurveyParticipantAttributeLanguage,
        surveyParticipantAttributeSnapshot:
          repoSurveyParticipantAttributeSnapshot,
        surveyParticipantAttributeLanguageSnapshot:
          repoSurveyParticipantAttributeLanguageSnapshot,
        surveySnapshotPartial: repoSurveySnapshotPartial,
        surveySnapshot: repoSurveySnapshot,
        surveyPublication: repoSurveyPublication,
        file: repoFile,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    const mockSnapshotService = {
      findByContentHash: jest.fn().mockResolvedValue(null),
    }
    const mockEventLog = { log: jest.fn().mockResolvedValue(undefined) }
    mockEmbedRefresh = jest.fn().mockResolvedValue(undefined)

    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveySnapshot: mockSnapshotService,
        eventLog: mockEventLog,
      }
      return map[name] ?? {}
    }) as typeof service.getService)

    Object.defineProperty(service, 'modelManager', {
      value: {
        services: {
          eventLog: mockEventLog,
          surveyEmbedArtefact: { refresh: mockEmbedRefresh },
        },
      },
      writable: true,
    })
  })

  const publishArgs = {
    surveyId: 'survey-1',
    projectId: 'project-1',
    label: null,
    notes: null,
    snapshotLabel: null,
    snapshotNotes: null,
    forceNewSnapshot: false,
    aclConditions: { projectAdmin: ['project-1'] },
    aclContext: { jwt: { _id: 'user-1' } },
  }

  test('stores snapshot survey with null settings resolved to project defaults', async () => {
    await service.publish(publishArgs)

    expect(snapshotInsertCapture).not.toBeNull()
    const storedSurvey = snapshotInsertCapture.survey

    // Null presentation settings → resolved from project defaults
    expect(storedSurvey.presentation.progressBar).toBe(true)
    expect(storedSurvey.presentation.format).toBe('group')
    expect(storedSurvey.presentation.noAnswer).toBe(true)

    // Null access settings → resolved from project defaults
    expect(storedSurvey.access.open).toBe(false)
    expect(storedSurvey.access.tokenPersist).toBe(true)

    // Explicitly set survey value preserved over project default
    expect(storedSurvey.access.publicReg).toBe(true)

    // Null participant settings → resolved from project defaults
    expect(storedSurvey.participant.htmlEmail).toBe(true)
    expect(storedSurvey.participant.tokenLength).toBe(16)

    // Null data settings → resolved from project defaults
    expect(storedSurvey.data.ip).toBe(false)
    expect(storedSurvey.data.timestamp).toBe(false)
  })

  test('writes the embed artefact after publishing', async () => {
    await service.publish(publishArgs)

    expect(mockEmbedRefresh).toHaveBeenCalledWith({
      surveyId: publishArgs.surveyId,
      projectId: publishArgs.projectId,
    })
  })

  test('stored snapshot survey has no null settings', async () => {
    await service.publish(publishArgs)

    const storedSurvey = snapshotInsertCapture.survey
    const settingsGroups = [
      storedSurvey.presentation,
      storedSurvey.access,
      storedSurvey.participant,
      storedSurvey.data,
    ]

    for (const group of settingsGroups) {
      for (const [key, value] of Object.entries(group)) {
        expect({ key, value }).not.toMatchObject({ value: null })
      }
    }
  })

  // Regression: commit 63cdd6b6 added `survey = survey.applySortOrder()` after the
  // repoSurvey.findOne in publish(). Populated questions/groups arrive in arbitrary DB
  // row order; the snapshot must store them in editor-configured (questionIds/groupIds)
  // order, or position-dependent publish validation compares against the wrong order.
  test('sorts questions and groups into questionIds/groupIds order before snapshotting', async () => {
    const q1 = new SurveyQuestion({
      _id: 'q1',
      code: 'Q1',
      surveyId: 'survey-1',
    })
    const q2 = new SurveyQuestion({
      _id: 'q2',
      code: 'Q2',
      surveyId: 'survey-1',
    })
    const g1 = new SurveySection({
      _id: 'g1',
      code: 'G1',
      surveyId: 'survey-1',
      kind: 'group',
    })
    const g2 = new SurveySection({
      _id: 'g2',
      code: 'G2',
      surveyId: 'survey-1',
      kind: 'group',
    })

    // DB row order (reversed relative to the editor order below)
    survey.elements = new SurveyElementCollection(q2, q1)
    survey.sections = new SurveySectionCollection(g2, g1)
    // Editor-configured order
    survey.elementIds = ['q1', 'q2']
    survey.sectionIds = ['g1', 'g2']

    await service.publish(publishArgs)

    expect(snapshotInsertCapture).not.toBeNull()
    const storedSurvey = snapshotInsertCapture.survey
    expect(
      Array.from(storedSurvey.elements.questions()).map((q) => q._id),
    ).toEqual(['q1', 'q2'])
    expect(
      Array.from(storedSurvey.sections.groups()).map((g) => g._id),
    ).toEqual(['g1', 'g2'])
  })
})

describe('ServicePublication.deleteMany', () => {
  let service: ServicePublication
  let mockEmbedRefresh: jest.Mock
  let mockEmbedRemoveSnapshots: jest.Mock
  let mockEventLog: { log: jest.Mock }
  let repoPublication: {
    find: jest.Mock
    count: jest.Mock
    deleteMany: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    transaction: jest.Mock
  }

  const mockDataSource: {
    transactionStart: jest.Mock
    transactionCommit: jest.Mock
    transactionRollback: jest.Mock
  } = {
    transactionStart: jest.fn(),
    transactionCommit: jest.fn().mockResolvedValue(undefined),
    transactionRollback: jest.fn().mockResolvedValue(undefined),
  }
  mockDataSource.transactionStart.mockResolvedValue(mockDataSource)

  const makePublication = (overrides: Record<string, unknown> = {}) => ({
    _id: 'publication-1',
    surveyId: 'survey-1',
    projectId: 'project-1',
    snapshotId: 'snapshot-1',
    stoppedAt: null,
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServicePublication()

    repoPublication = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1), // snapshot still referenced - skip orphan cleanup
      deleteMany: jest.fn().mockResolvedValue(undefined),
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      transaction: jest.fn(),
    }
    repoPublication.transaction = mockRepoTransaction(repoPublication)

    const repoSurveyResponse = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveySnapshotPartial = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveySnapshot = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveyLanguageSnapshot = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveyParticipantAttributeSnapshot = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
    }
    const repoSurveyParticipantAttributeLanguageSnapshot = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyPublication: repoPublication,
        surveyResponse: repoSurveyResponse,
        surveySnapshotPartial: repoSurveySnapshotPartial,
        surveySnapshot: repoSurveySnapshot,
        surveyLanguageSnapshot: repoSurveyLanguageSnapshot,
        surveyParticipantAttributeSnapshot:
          repoSurveyParticipantAttributeSnapshot,
        surveyParticipantAttributeLanguageSnapshot:
          repoSurveyParticipantAttributeLanguageSnapshot,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    mockEventLog = { log: jest.fn().mockResolvedValue(undefined) }
    mockEmbedRefresh = jest.fn().mockResolvedValue(undefined)
    mockEmbedRemoveSnapshots = jest.fn().mockResolvedValue(undefined)
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { eventLog: mockEventLog }
      return map[name] ?? {}
    }) as typeof service.getService)

    Object.defineProperty(service, 'modelManager', {
      value: {
        services: {
          eventLog: mockEventLog,
          surveyEmbedArtefact: {
            refresh: mockEmbedRefresh,
            removeSnapshots: mockEmbedRemoveSnapshots,
          },
        },
      },
      writable: true,
    })
  })

  const deleteArgs = (publicationIds: string[]) => ({
    surveyId: 'survey-1',
    publicationIds,
    projectId: 'project-1',
    aclConditions: { projectAdmin: ['project-1'] },
  })

  test('logs survey.unpublished and deletes the row when the active publication is deleted', async () => {
    repoPublication.find.mockResolvedValue([
      makePublication({ stoppedAt: null }),
    ])

    await service.deleteMany(deleteArgs(['publication-1']))

    expect(repoPublication.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $in: ['publication-1'] } }),
      expect.anything(),
    )
    expect(mockEventLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        action: 'survey.unpublished',
        metadata: { surveyId: 'survey-1' },
      }),
    )
  })

  test('does not log survey.unpublished when only stopped publications are deleted', async () => {
    repoPublication.find.mockResolvedValue([
      makePublication({ stoppedAt: new Date() }),
    ])

    await service.deleteMany(deleteArgs(['publication-1']))

    expect(mockEventLog.log).not.toHaveBeenCalled()
  })

  test('logs survey.unpublished exactly once for a mixed batch', async () => {
    repoPublication.find.mockResolvedValue([
      makePublication({ _id: 'publication-1', stoppedAt: null }),
      makePublication({ _id: 'publication-2', stoppedAt: new Date() }),
    ])

    await service.deleteMany(deleteArgs(['publication-1', 'publication-2']))

    expect(mockEventLog.log).toHaveBeenCalledTimes(1)
    expect(mockEventLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'survey.unpublished' }),
    )
  })

  test('refreshes the embed pointer when the active publication is deleted but its snapshot is still referenced', async () => {
    repoPublication.find.mockResolvedValue([
      makePublication({ stoppedAt: null }),
    ])

    await service.deleteMany(deleteArgs(['publication-1']))

    expect(mockEmbedRefresh).toHaveBeenCalledWith({
      surveyId: 'survey-1',
      projectId: 'project-1',
    })
    expect(mockEmbedRemoveSnapshots).not.toHaveBeenCalled()
  })

  test('removes the embed artefacts of snapshots that become orphaned', async () => {
    repoPublication.count.mockResolvedValue(0)
    repoPublication.find.mockResolvedValue([
      makePublication({ stoppedAt: new Date() }),
    ])

    await service.deleteMany(deleteArgs(['publication-1']))

    expect(mockEmbedRemoveSnapshots).toHaveBeenCalledWith({
      surveyId: 'survey-1',
      projectId: 'project-1',
      snapshotIds: [expect.any(String)],
    })
    expect(mockEmbedRefresh).not.toHaveBeenCalled()
  })

  test('leaves the embed files alone when a stopped publication is deleted and its snapshot is still referenced', async () => {
    repoPublication.find.mockResolvedValue([
      makePublication({ stoppedAt: new Date() }),
    ])

    await service.deleteMany(deleteArgs(['publication-1']))

    expect(mockEmbedRefresh).not.toHaveBeenCalled()
    expect(mockEmbedRemoveSnapshots).not.toHaveBeenCalled()
  })

  test('does not log survey.unpublished when the transaction rolls back', async () => {
    // Simulate "one or more publications not found" - fewer rows found than requested
    repoPublication.find.mockResolvedValue([
      makePublication({ _id: 'publication-1', stoppedAt: null }),
    ])

    await expect(
      service.deleteMany(deleteArgs(['publication-1', 'publication-2'])),
    ).rejects.toThrow('One or more publications not found')

    expect(mockEventLog.log).not.toHaveBeenCalled()
    expect(repoPublication.deleteMany).not.toHaveBeenCalled()
  })
})

describe('ServicePublication.hasUnpublishedChanges', () => {
  let service: ServicePublication
  let survey: Survey
  let settingSurvey: SettingSurvey
  let repoPublication: { findOne: jest.Mock }
  let repoSurveySnapshotPartial: { findOne: jest.Mock }

  const hasUnpublishedChangesArgs = {
    surveyId: 'survey-1',
    projectId: 'project-1',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServicePublication()

    survey = makeSurvey()
    settingSurvey = makeSettingSurvey()

    repoPublication = { findOne: jest.fn() }
    repoSurveySnapshotPartial = { findOne: jest.fn() }

    const repoSurvey = { findOne: jest.fn().mockResolvedValue(survey) }
    const repoSettingSurvey = {
      findOne: jest.fn().mockResolvedValue(settingSurvey),
    }
    const repoSurveyLanguage = { find: jest.fn().mockResolvedValue([]) }
    const repoSurveyParticipantAttribute = {
      findOne: jest.fn().mockResolvedValue(null),
    }
    const repoSurveyParticipantAttributeLanguage = {
      find: jest.fn().mockResolvedValue([]),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveyPublication: repoPublication,
        surveySnapshotPartial: repoSurveySnapshotPartial,
        survey: repoSurvey,
        settingSurvey: repoSettingSurvey,
        surveyLanguage: repoSurveyLanguage,
        surveyParticipantAttribute: repoSurveyParticipantAttribute,
        surveyParticipantAttributeLanguage:
          repoSurveyParticipantAttributeLanguage,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)
  })

  test('returns false when there is no active publication', async () => {
    repoPublication.findOne.mockResolvedValue(null)

    const result = await service.hasUnpublishedChanges(
      hasUnpublishedChangesArgs,
    )

    expect(result).toEqual({ hasChanges: false })
    expect(repoSurveySnapshotPartial.findOne).not.toHaveBeenCalled()
  })

  test('returns false when the snapshot record is missing (orphaned publication)', async () => {
    repoPublication.findOne.mockResolvedValue({ snapshotId: 'snapshot-1' })
    repoSurveySnapshotPartial.findOne.mockResolvedValue(null)

    const result = await service.hasUnpublishedChanges(
      hasUnpublishedChangesArgs,
    )

    expect(result).toEqual({ hasChanges: false })
  })

  test('returns false when the live survey hash matches the published snapshot hash', async () => {
    repoPublication.findOne.mockResolvedValue({ snapshotId: 'snapshot-1' })

    // Compute the real hash the service would produce for this survey/settings,
    // by calling the private helper directly, so the snapshot's stored hash
    // matches exactly what hasUnpublishedChanges() will compute.
    const { contentHash } = (
      service as unknown as {
        computeContentHash: (
          survey: Survey,
          settingSurvey: SettingSurvey,
          allLanguages: unknown[],
          surveyParticipantAttributeDoc: unknown,
          attributeLanguageDocs: unknown[],
        ) => { contentHash: string }
      }
    ).computeContentHash(survey, settingSurvey, [], null, [])

    repoSurveySnapshotPartial.findOne.mockResolvedValue({ contentHash })

    const result = await service.hasUnpublishedChanges(
      hasUnpublishedChangesArgs,
    )

    expect(result).toEqual({ hasChanges: false })
  })

  test('returns true when the live survey hash differs from the published snapshot hash', async () => {
    repoPublication.findOne.mockResolvedValue({ snapshotId: 'snapshot-1' })
    repoSurveySnapshotPartial.findOne.mockResolvedValue({
      contentHash: 'stale-hash-from-a-previous-publish',
    })

    const result = await service.hasUnpublishedChanges(
      hasUnpublishedChangesArgs,
    )

    expect(result).toEqual({ hasChanges: true })
  })

  // Regression: commit 63cdd6b6 added `survey = survey.applySortOrder()` after the
  // repoSurvey.findOne in hasUnpublishedChanges(). Without it, the content hash depends
  // on arbitrary DB row order and reports false-positive "unpublished changes".
  test('ignores DB row order — no false-positive changes when rows differ from questionIds order', async () => {
    const q1 = new SurveyQuestion({
      _id: 'q1',
      code: 'Q1',
      surveyId: 'survey-1',
    })
    const q2 = new SurveyQuestion({
      _id: 'q2',
      code: 'Q2',
      surveyId: 'survey-1',
    })
    survey.elements = new SurveyElementCollection(q2, q1)
    survey.elementIds = ['q1', 'q2']

    // The hash a correct publish would have stored (from the sorted survey).
    const { contentHash: publishedHash } = (
      service as unknown as {
        computeContentHash: (
          survey: Survey,
          settingSurvey: SettingSurvey,
          allLanguages: unknown[],
          surveyParticipantAttributeDoc: unknown,
          attributeLanguageDocs: unknown[],
        ) => { contentHash: string }
      }
    ).computeContentHash(survey.applySortOrder(), settingSurvey, [], null, [])

    repoPublication.findOne.mockResolvedValue({ snapshotId: 'snapshot-1' })
    repoSurveySnapshotPartial.findOne.mockResolvedValue({
      contentHash: publishedHash,
    })

    const result = await service.hasUnpublishedChanges(
      hasUnpublishedChangesArgs,
    )

    expect(result).toEqual({ hasChanges: false })
  })

  test('reports no changes when a question is moved away and back to its original position', async () => {
    const question1 = new SurveyQuestion({
      _id: 'q1',
      code: 'Q1',
      surveyId: 'survey-1',
    })
    const question2 = new SurveyQuestion({
      _id: 'q2',
      code: 'Q2',
      surveyId: 'survey-1',
    })
    survey.elements = new SurveyElementCollection(question1, question2)
    survey.elementIds = ['q1', 'q2']

    const computeHash = () =>
      (
        service as unknown as {
          computeContentHash: (
            survey: Survey,
            settingSurvey: SettingSurvey,
            allLanguages: unknown[],
            surveyParticipantAttributeDoc: unknown,
            attributeLanguageDocs: unknown[],
          ) => { contentHash: string }
        }
      ).computeContentHash(survey, settingSurvey, [], null, [])

    const { contentHash: publishedHash } = computeHash()

    // Move q1 after q2, then back to its original position — net no-op.
    survey.elementIds = ['q2', 'q1']
    survey.elementIds = ['q1', 'q2']

    repoPublication.findOne.mockResolvedValue({ snapshotId: 'snapshot-1' })
    repoSurveySnapshotPartial.findOne.mockResolvedValue({
      contentHash: publishedHash,
    })

    const result = await service.hasUnpublishedChanges(
      hasUnpublishedChangesArgs,
    )

    expect(result).toEqual({ hasChanges: false })
  })
})
