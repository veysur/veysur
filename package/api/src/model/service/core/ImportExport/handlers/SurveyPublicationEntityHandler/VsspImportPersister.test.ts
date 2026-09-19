import type {
  RepoSurvey,
  RepoSurveyParticipant,
  RepoSurveyPublication,
  RepoSurveyElement,
  RepoSurveySection,
  RepoSurveyResponse,
  RepoSurveySnapshot,
  RepoSurveySnapshotPartial,
} from 'model'
import { VsspImportPersister } from './VsspImportPersister'
import { SnapshotDataRemapper } from './SnapshotDataRemapper'
import type { EntityParsedData } from '../../EntityHandlerInterface'
import type { ResolvedImportContext } from './types'
import { mockRepoTransaction } from '../../../../../../test-utils/mockRepoTransaction'

describe('VsspImportPersister', () => {
  let mockRepoSurveyResponse: {
    findOne: jest.Mock
    insertOne: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    transaction: jest.Mock
  }
  let mockRepoSurveyPublication: { insertOne: jest.Mock }
  let persister: VsspImportPersister

  const projectId = 'project-1'
  const surveyId = 'survey-1'
  const snapshotId = 'snapshot-1'
  const publicationId = 'publication-1'

  const mockParsedData: EntityParsedData = {
    getJson: jest.fn().mockReturnValue(null),
    getBinaryS3Key: jest.fn().mockReturnValue(null),
    listEntries: jest.fn().mockReturnValue([]),
    cleanup: jest.fn().mockResolvedValue(undefined),
    deleteJson: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-07-09T12:00:00.000Z'))

    const mockDataSource = {
      transactionStart: jest.fn(),
      transactionCommit: jest.fn(),
      transactionRollback: jest.fn(),
    }
    mockDataSource.transactionStart.mockResolvedValue(mockDataSource)

    mockRepoSurveyResponse = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue(undefined),
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      transaction: jest.fn(),
    }
    mockRepoSurveyResponse.transaction = mockRepoTransaction(
      mockRepoSurveyResponse,
    )

    mockRepoSurveyPublication = {
      insertOne: jest.fn().mockResolvedValue(undefined),
    }

    persister = new VsspImportPersister(
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      undefined as unknown as RepoSurveySnapshot,
      undefined as unknown as RepoSurveySnapshotPartial,
      undefined as unknown as RepoSurvey,
      undefined as unknown as RepoSurveyParticipant,
      undefined as unknown as RepoSurveyElement,
      undefined as unknown as RepoSurveySection,
      new SnapshotDataRemapper(),
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  function buildContext(
    publication: Record<string, unknown>,
  ): ResolvedImportContext {
    return {
      publication,
      snapshotData: {},
      snapshot: null,
      surveyLanguageSnapshots: [],
      surveyParticipantAttributeSnapshot: null,
      surveyParticipantAttributeLanguageSnapshots: [],
      responseBatchKeys: [],
      embeddedFileEntries: [],
      parsedData: mockParsedData,
      resolvedSurveyId: surveyId,
      createSurvey: false,
      surveyDataForCreate: null,
      resolvedSnapshotId: snapshotId,
      createSnapshot: false,
      resolvedPublicationId: publicationId,
      fileResolutions: [],
      imageSetIdMap: {},
    } as unknown as ResolvedImportContext
  }

  const persistImportContext = {
    projectId,
    aclContext: { jwt: { _id: 'user-1' } },
  }

  test('archived publication was active (stopped: null) is imported as stopped now', async () => {
    await persister.persist(
      buildContext({
        publishedAt: '2026-01-01T00:00:00.000Z',
        stoppedAt: null,
      }),
      persistImportContext,
    )

    expect(mockRepoSurveyPublication.insertOne).toHaveBeenCalledTimes(1)
    const pub = mockRepoSurveyPublication.insertOne.mock.calls[0][0]
    expect(pub.stoppedAt).toEqual(new Date('2026-07-09T12:00:00.000Z'))
    expect(pub.publishedAt).toEqual(new Date('2026-01-01T00:00:00.000Z'))
  })

  test('archived publication was already stopped preserves the original timestamp', async () => {
    const originalStopped = '2026-02-15T09:30:00.000Z'

    await persister.persist(
      buildContext({
        publishedAt: '2026-01-01T00:00:00.000Z',
        stoppedAt: originalStopped,
      }),
      persistImportContext,
    )

    const pub = mockRepoSurveyPublication.insertOne.mock.calls[0][0]
    expect(pub.stoppedAt).toEqual(new Date(originalStopped))
  })

  test('does not mutate any other publication records on the target survey', async () => {
    await persister.persist(
      buildContext({
        publishedAt: '2026-01-01T00:00:00.000Z',
        stoppedAt: null,
      }),
      persistImportContext,
    )

    expect(mockRepoSurveyPublication.insertOne).toHaveBeenCalledTimes(1)
    expect(
      (mockRepoSurveyPublication as unknown as { updateMany?: jest.Mock })
        .updateMany,
    ).toBeUndefined()
  })
})
