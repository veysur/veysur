import type {
  RepoSurvey,
  RepoSurveyParticipant,
  RepoSurveyPublication,
  RepoSurveyElement,
  RepoSurveySection,
  RepoSurveyResponse,
  RepoSurveySnapshot,
  RepoSurveySnapshotPartial,
  RepoFile,
} from 'model'
import { VsspImportPersister } from './VsspImportPersister'
import { SnapshotDataRemapper } from './SnapshotDataRemapper'
import type { EntityParsedData } from '../../EntityHandlerInterface'
import type { ResolvedImportContext, ResponseFileManifestEntry } from './types'
import { mockRepoTransaction } from '../../../../../../test-utils/mockRepoTransaction'
import { createStorageAdaptor } from 'common'

jest.mock('common', () => ({
  ...jest.requireActual('common'),
  createStorageAdaptor: jest.fn().mockReturnValue({
    copyObject: jest.fn().mockResolvedValue(undefined),
  }),
}))

describe('VsspImportPersister', () => {
  let mockRepoSurveyResponse: {
    findOne: jest.Mock
    insertOne: jest.Mock
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    transaction: jest.Mock
  }
  let mockRepoSurveyPublication: { insertOne: jest.Mock }
  let mockRepoFile: { findOne: jest.Mock; create: jest.Mock }
  let persister: VsspImportPersister
  let persisterWithFiles: VsspImportPersister

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

    mockRepoFile = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
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

    persisterWithFiles = new VsspImportPersister(
      mockRepoSurveyResponse as unknown as RepoSurveyResponse,
      mockRepoSurveyPublication as unknown as RepoSurveyPublication,
      undefined as unknown as RepoSurveySnapshot,
      undefined as unknown as RepoSurveySnapshotPartial,
      undefined as unknown as RepoSurvey,
      undefined as unknown as RepoSurveyParticipant,
      undefined as unknown as RepoSurveyElement,
      undefined as unknown as RepoSurveySection,
      new SnapshotDataRemapper(),
      undefined,
      mockRepoFile as unknown as RepoFile,
      {
        type: 'local',
        publicBucket: 'public',
        privateBucket: 'private',
      } as never,
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

  describe('response file remapping', () => {
    const responseFileEntry: ResponseFileManifestEntry = {
      fileId: 'archive-file-1',
      filename: 'cv.pdf',
      s3Key: 'files/response/archive-file-1.pdf',
      mimeType: 'application/pdf',
      hash: 'hash-abc',
      size: 1234,
      bucket: '000',
      archiveEntryPath: 'files/response/000/archive-file-1.pdf',
    }

    function buildContextWithResponseFile(
      overrides: Partial<ResolvedImportContext> = {},
    ): ResolvedImportContext {
      return {
        ...buildContext({
          publishedAt: '2026-01-01T00:00:00.000Z',
          stoppedAt: null,
        }),
        responseBatchKeys: ['responses/batch-000001.json'],
        responseFileEntries: [responseFileEntry],
        ...overrides,
      } as ResolvedImportContext
    }

    beforeEach(() => {
      ;(mockParsedData.getJson as jest.Mock).mockImplementation(
        (name: string) => {
          if (name === 'responses/batch-000001.json') {
            return {
              responses: [
                {
                  _id: 'response-1',
                  answers: { q1: { fileIds: ['archive-file-1'] } },
                },
              ],
            }
          }
          return null
        },
      )
    })

    test('creates a new File record and remaps the answer fileId when no matching file exists in this survey', async () => {
      mockRepoFile.findOne.mockResolvedValue(null)

      await persisterWithFiles.persist(
        buildContextWithResponseFile(),
        persistImportContext,
      )

      expect(mockRepoFile.create).toHaveBeenCalledTimes(1)
      const createdFile = mockRepoFile.create.mock.calls[0][0]
      expect(createdFile.surveyId).toBe(surveyId)
      expect(createdFile.responseId).toBe('response-1')
      expect(createdFile.fileContext).toBe('response')
      expect(createdFile.hash).toBe('hash-abc')

      const insertedResponse = mockRepoSurveyResponse.insertOne.mock.calls[0][0]
      expect(insertedResponse.answers.q1.fileIds).toEqual([createdFile._id])
      expect(insertedResponse.answers.q1.fileIds[0]).not.toBe('archive-file-1')
    })

    test('reuses an existing File with the same hash in this survey instead of creating a duplicate', async () => {
      mockRepoFile.findOne.mockResolvedValue({ _id: 'existing-file-99' })

      await persisterWithFiles.persist(
        buildContextWithResponseFile(),
        persistImportContext,
      )

      expect(mockRepoFile.create).not.toHaveBeenCalled()
      const insertedResponse = mockRepoSurveyResponse.insertOne.mock.calls[0][0]
      expect(insertedResponse.answers.q1.fileIds).toEqual(['existing-file-99'])
    })

    test('does nothing when the persister has no repoFile/storageConfig wired (vsst-only deployments)', async () => {
      await persister.persist(
        buildContextWithResponseFile(),
        persistImportContext,
      )

      const insertedResponse = mockRepoSurveyResponse.insertOne.mock.calls[0][0]
      expect(insertedResponse.answers.q1.fileIds).toEqual(['archive-file-1'])
    })

    test('copies a private-bucket response file into the private bucket and preserves its bucketType', async () => {
      mockRepoFile.findOne.mockResolvedValue(null)
      ;(mockParsedData.getBinaryS3Key as jest.Mock).mockReturnValue(
        'staging/archive-file-1.pdf',
      )
      const mockAdaptor = (createStorageAdaptor as jest.Mock)(
        {} as never,
      ) as { copyObject: jest.Mock }

      await persisterWithFiles.persist(
        buildContextWithResponseFile({
          responseFileEntries: [{ ...responseFileEntry, bucketType: 'private' }],
        }),
        persistImportContext,
      )

      expect(mockAdaptor.copyObject).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: 'private' }),
      )
      const createdFile = mockRepoFile.create.mock.calls[0][0]
      expect(createdFile.bucketType).toBe('private')
    })

    test('copies a public (or unspecified bucketType) response file into the public bucket', async () => {
      mockRepoFile.findOne.mockResolvedValue(null)
      ;(mockParsedData.getBinaryS3Key as jest.Mock).mockReturnValue(
        'staging/archive-file-1.pdf',
      )
      const mockAdaptor = (createStorageAdaptor as jest.Mock)(
        {} as never,
      ) as { copyObject: jest.Mock }

      await persisterWithFiles.persist(
        buildContextWithResponseFile(),
        persistImportContext,
      )

      expect(mockAdaptor.copyObject).toHaveBeenCalledWith(
        expect.objectContaining({ Bucket: 'public' }),
      )
      const createdFile = mockRepoFile.create.mock.calls[0][0]
      expect(createdFile.bucketType).toBe('public')
    })
  })
})
