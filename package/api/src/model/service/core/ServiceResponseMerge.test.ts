import { ServiceResponseMerge } from './ServiceResponseMerge'
import { Survey, SurveyResponse, MergeOptions } from 'veysur-common'
import { mockRepoTransaction } from '../../../test-utils/mockRepoTransaction'

// Mock the repository dependencies
jest.mock('model', () => ({
  getRepo: jest.fn(() => ({
    find: jest.fn(),
    findOne: jest.fn(),
    insertOne: jest.fn(),
    count: jest.fn(),
  })),
  getDataSource: jest.fn(() => ({
    transactionStart: jest.fn(),
    transactionCommit: jest.fn(),
    transactionRollback: jest.fn(),
  })),
}))

type MergeQuery = {
  _id?: string
  snapshotId?: string
  publicationId?: string
}

describe('ServiceResponseMerge - Deduplication Logic', () => {
  let service: ServiceResponseMerge
  let mockSurveySnapshotPartialRepo: {
    find: jest.Mock
    findOne: jest.Mock
    insertOne: jest.Mock
    dataSource: {
      transactionStart: jest.Mock
      transactionCommit: jest.Mock
      transactionRollback: jest.Mock
    }
  }
  let mockSurveySnapshotRepo: { findOne: jest.Mock }
  let mockSurveyResponseRepo: {
    find: jest.Mock
    insertOne: jest.Mock
    dataSource: {
      transactionStart: jest.Mock
      transactionCommit: jest.Mock
      transactionRollback: jest.Mock
    }
    getDataSource: jest.Mock
    releaseDataSource: jest.Mock
    transaction: jest.Mock
  }
  let mockSurveyPublicationRepo: { findOne: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceResponseMerge()

    // Mock repositories
    mockSurveySnapshotPartialRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      dataSource: {
        transactionStart: jest.fn(),
        transactionCommit: jest.fn(),
        transactionRollback: jest.fn(),
      },
    }
    mockSurveySnapshotRepo = {
      findOne: jest.fn(),
    }
    const mockDataSource = {
      transactionStart: jest.fn(),
      transactionCommit: jest.fn(),
      transactionRollback: jest.fn(),
    }
    // transactionStart() now returns the lease to run the transaction against - self-reference
    // it here since these mocks don't model the real per-caller lease split.
    mockDataSource.transactionStart.mockResolvedValue(mockDataSource)
    mockSurveyResponseRepo = {
      find: jest.fn(),
      insertOne: jest.fn(),
      dataSource: mockDataSource,
      getDataSource: jest.fn().mockResolvedValue(mockDataSource),
      releaseDataSource: jest.fn(),
      transaction: jest.fn(),
    }
    mockSurveyResponseRepo.transaction = mockRepoTransaction(
      mockSurveyResponseRepo,
    )
    mockSurveyPublicationRepo = {
      findOne: jest.fn().mockResolvedValue(null), // Default: no publication
    }

    // Mock getRepo on the service instance
    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        surveySnapshotPartial: mockSurveySnapshotPartialRepo,
        surveySnapshot: mockSurveySnapshotRepo,
        surveyResponse: mockSurveyResponseRepo,
        surveyPublication: mockSurveyPublicationRepo,
        surveyParticipantAttribute: {
          findOne: jest.fn().mockResolvedValue(null),
        },
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)
  })

  describe('origResponseId deduplication', () => {
    test('should prevent duplicate when merging A → B → A (circular merge)', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      // Mock publication for target snapshot
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-a',
        snapshotId: snapshotAId,
      })

      // Step 1: Original response X in Snapshot A
      const originalResponseX = new SurveyResponse({
        _id: 'response-x',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer' },
        merge: null, // Original response
      })

      // Step 2: Merged response Y in Snapshot B (from X)
      const mergedResponseY = new SurveyResponse({
        _id: 'response-y',
        surveyId,
        snapshotId: snapshotBId,
        answers: { Q1: 'answer' },
        merge: {
          fromSnapshotId: snapshotAId,
          origResponseId: 'response-x', // Points to original X
          at: new Date(),
        },
      })

      // Mock source responses (Snapshot B contains merged response Y)
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotBId) {
          // Source responses from Snapshot B
          return Promise.resolve([mergedResponseY])
        }
        if (query.snapshotId === snapshotAId) {
          // Target responses from Snapshot A
          return Promise.resolve([originalResponseX])
        }
        return Promise.resolve([])
      })

      // Try to merge B → A (should prevent circular merge)
      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotAId,
        sourceSnapshotId: snapshotBId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      // Verify: No responses should be created (circular merge prevented)
      expect(result.stats.responsesCreated).toBe(0)
      expect(result.stats.responsesAlreadyMerged).toBe(1)
      expect(result.stats.sourceResponseCount).toBe(1)
    })

    test('should prevent duplicate when merging A → B twice', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      // Mock publication for target snapshot
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-b',
        snapshotId: snapshotBId,
      })

      // Step 1: Original response X in Snapshot A
      const originalResponseX = new SurveyResponse({
        _id: 'response-x',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer' },
        merge: null, // Original response
      })

      // Step 2: Already merged response Y in Snapshot B (from first merge)
      const alreadyMergedY = new SurveyResponse({
        _id: 'response-y',
        surveyId,
        snapshotId: snapshotBId,
        answers: { Q1: 'answer' },
        merge: {
          fromSnapshotId: snapshotAId,
          origResponseId: 'response-x',
          at: new Date(),
        },
      })

      // Mock source responses (Snapshot A contains original X)
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          // Source responses from Snapshot A
          return Promise.resolve([originalResponseX])
        }
        if (query.snapshotId === snapshotBId) {
          // Target responses from Snapshot B (already contains merged response)
          return Promise.resolve([alreadyMergedY])
        }
        return Promise.resolve([])
      })

      // Try to merge A → B again (should prevent duplicate)
      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      // Verify: No responses should be created (duplicate prevented)
      expect(result.stats.responsesCreated).toBe(0)
      expect(result.stats.responsesAlreadyMerged).toBe(1)
      expect(result.stats.sourceResponseCount).toBe(1)
    })

    test('should allow merge when origResponseId differs', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      // Different responses with different origResponseIds
      const responseX = new SurveyResponse({
        _id: 'response-x',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer-x' },
        merge: null, // Original response
      })

      const responseY = new SurveyResponse({
        _id: 'response-y',
        surveyId,
        snapshotId: snapshotBId,
        answers: { Q1: 'answer-y' },
        merge: null, // Different original response
      })

      // Mock source responses
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([responseX])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([responseY])
        }
        return Promise.resolve([])
      })

      // Need to mock publication for this test
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-1',
        snapshotId: snapshotBId,
      })

      // Merge A → B (should allow - different responses)
      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      // Verify: Response should be created (different origResponseId)
      expect(result.stats.responsesCreated).toBe(1)
      expect(result.stats.responsesAlreadyMerged).toBe(0)
    })

    test('should handle legacy responses without origResponseId', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      // Legacy merged response (null origResponseId)
      const legacyMergedResponse = new SurveyResponse({
        _id: 'response-legacy',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer' },
        merge: {
          fromSnapshotId: snapshotBId,
          origResponseId: null, // Legacy format
          at: new Date(),
        },
      })

      // Mock source and target responses
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([legacyMergedResponse])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      // Need to mock publication for this test
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-1',
        snapshotId: snapshotBId,
      })

      // Try to merge A → B (legacy response should use _id as origResponseId)
      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      // Verify: Response should be created (legacy treated as original)
      expect(result.stats.responsesCreated).toBe(1)
      expect(result.stats.responsesAlreadyMerged).toBe(0)
    })

    test('should handle multi-hop merge chain A → B → C correctly', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'
      const snapshotCId = 'snapshot-c'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotCId) {
            return Promise.resolve({ _id: snapshotCId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      // Mock publication for target snapshot
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-a',
        snapshotId: snapshotAId,
      })

      // Chain: X (A) → Y (B) → Z (C)
      const originalResponseX = new SurveyResponse({
        _id: 'response-x',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer' },
        merge: null,
      })

      const responseZinC = new SurveyResponse({
        _id: 'response-z',
        surveyId,
        snapshotId: snapshotCId,
        answers: { Q1: 'answer' },
        merge: {
          fromSnapshotId: snapshotBId,
          origResponseId: 'response-x', // Traces back to original X
          at: new Date(),
        },
      })

      // Mock responses
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotCId) {
          return Promise.resolve([responseZinC])
        }
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([originalResponseX])
        }
        return Promise.resolve([])
      })

      // Try to merge C → A (should prevent - Z traces back to X in A)
      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotAId,
        sourceSnapshotId: snapshotCId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      // Verify: Should prevent circular merge
      expect(result.stats.responsesCreated).toBe(0)
      expect(result.stats.responsesAlreadyMerged).toBe(1)
    })

    test('should allow merge when target snapshot is empty', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      const sourceResponse = new SurveyResponse({
        _id: 'response-1',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer' },
        merge: null,
      })

      // Mock responses - target is empty
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([sourceResponse])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([]) // Empty target
        }
        return Promise.resolve([])
      })

      // Need to mock publication for this test
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-1',
        snapshotId: snapshotBId,
      })

      // Merge A → B (empty target should allow all)
      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      // Verify: Should create response in empty target
      expect(result.stats.responsesCreated).toBe(1)
      expect(result.stats.responsesAlreadyMerged).toBe(0)
    })

    test('should create proper origResponseId for new merged responses', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      // Source response that is already merged (has origResponseId)
      const mergedSourceResponse = new SurveyResponse({
        _id: 'response-merged',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer' },
        merge: {
          fromSnapshotId: 'snapshot-original',
          origResponseId: 'response-original', // Points to original
          at: new Date(),
        },
      })

      const originalSourceResponse = new SurveyResponse({
        _id: 'response-native',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer2' },
        merge: null, // Native response
      })

      // Mock responses
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([mergedSourceResponse, originalSourceResponse])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([]) // Empty target
        }
        return Promise.resolve([])
      })

      // Need to mock publication for this test
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-1',
        snapshotId: snapshotBId,
      })

      const createdResponses: SurveyResponse[] = []
      mockSurveyResponseRepo.insertOne.mockImplementation(
        (response: SurveyResponse) => {
          createdResponses.push(response)
          return Promise.resolve()
        },
      )

      // Actual merge (not dry run)
      await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: false } as MergeOptions,
      })

      // Verify created responses have correct origResponseId
      expect(createdResponses).toHaveLength(2)

      // First response: merged source should keep original origResponseId
      const mergedResponse = createdResponses.find(
        (r) => (r.answers as Record<string, unknown>).Q1 === 'answer',
      )
      expect(mergedResponse.merge.origResponseId).toBe('response-original') // Inherited

      // Second response: native source should use its own _id as origResponseId
      const nativeResponse = createdResponses.find(
        (r) => (r.answers as Record<string, unknown>).Q1 === 'answer2',
      )
      expect(nativeResponse.merge.origResponseId).toBe('response-native') // Uses own ID
    })

    test('propagates completed=true with a null completedAt (timestamp setting off) when all answers map', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      mockSurveySnapshotRepo.findOne.mockImplementation((_query: MergeQuery) =>
        Promise.resolve({ survey: mockSurvey }),
      )

      const sourceResponse = new SurveyResponse({
        _id: 'response-1',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer' },
        completed: true,
        completedAt: null, // Timestamp setting was off when this response completed
        merge: null,
      })

      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([sourceResponse])
        }
        return Promise.resolve([])
      })

      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-1',
        snapshotId: snapshotBId,
      })

      const createdResponses: SurveyResponse[] = []
      mockSurveyResponseRepo.insertOne.mockImplementation(
        (response: SurveyResponse) => {
          createdResponses.push(response)
          return Promise.resolve()
        },
      )

      await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: false } as MergeOptions,
      })

      expect(createdResponses).toHaveLength(1)
      expect(createdResponses[0].completed).toBe(true)
      expect(createdResponses[0].completedAt).toBeNull()
    })

    test('sets completed=false when not all answers mapped, regardless of source completion', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      const sourceSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
          { _id: 'q2', code: 'Q2', text: { en: 'Question 2' }, type: 'text' },
        ],
      })
      // Target snapshot dropped Q2 — Q2's answer will be skipped, not mapped.
      const targetSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      mockSurveySnapshotRepo.findOne.mockImplementation(
        (query: { snapshotId?: string }) => {
          if (query.snapshotId === snapshotAId) {
            return Promise.resolve({ survey: sourceSurvey })
          }
          return Promise.resolve({ survey: targetSurvey })
        },
      )

      const sourceResponse = new SurveyResponse({
        _id: 'response-1',
        surveyId,
        snapshotId: snapshotAId,
        answers: { Q1: 'answer', Q2: 'answer2' },
        completed: true,
        completedAt: new Date(),
        merge: null,
      })

      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([sourceResponse])
        }
        return Promise.resolve([])
      })

      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-1',
        snapshotId: snapshotBId,
      })

      const createdResponses: SurveyResponse[] = []
      mockSurveyResponseRepo.insertOne.mockImplementation(
        (response: SurveyResponse) => {
          createdResponses.push(response)
          return Promise.resolve()
        },
      )

      await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: false } as MergeOptions,
      })

      expect(createdResponses).toHaveLength(1)
      expect(createdResponses[0].completed).toBe(false)
      expect(createdResponses[0].completedAt).toBeNull()
    })

    test('should set publicationId from target snapshot publication, not source', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      // Mock survey with a question
      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      // Mock snapshots exist
      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      // Mock snapshot data
      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      // Mock target publication exists
      const targetPublication = {
        _id: 'publication-target',
        snapshotId: snapshotBId,
      }
      mockSurveyPublicationRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query.snapshotId === snapshotBId) {
            return Promise.resolve(targetPublication)
          }
          return Promise.resolve(null)
        },
      )

      const sourceResponse = new SurveyResponse({
        _id: 'response-1',
        surveyId,
        snapshotId: snapshotAId,
        publicationId: 'publication-source', // Should be ignored
        answers: { Q1: 'answer' },
        merge: null,
      })

      // Mock responses
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([sourceResponse])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([]) // Empty target
        }
        return Promise.resolve([])
      })

      const createdResponses: SurveyResponse[] = []
      mockSurveyResponseRepo.insertOne.mockImplementation(
        (response: SurveyResponse) => {
          createdResponses.push(response)
          return Promise.resolve()
        },
      )

      // Actual merge (not dry run)
      await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: false } as MergeOptions,
      })

      // Verify created response has target publication ID, not source
      expect(createdResponses).toHaveLength(1)
      expect(createdResponses[0].publicationId).toBe('publication-target') // Target publication
      expect(createdResponses[0].publicationId).not.toBe('publication-source') // Not source publication
    })
  })

  describe('participantId deduplication', () => {
    test('should skip source response when participant already has an unrelated response in target', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'
      const participantId = 'participant-1'

      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-b',
        snapshotId: snapshotBId,
      })

      // Same participant, independent responses in each snapshot — no merge lineage
      const sourceResponse = new SurveyResponse({
        _id: 'response-source',
        surveyId,
        snapshotId: snapshotAId,
        participantId,
        answers: { Q1: 'answer-a' },
        merge: null,
      })

      const existingTargetResponse = new SurveyResponse({
        _id: 'response-target',
        surveyId,
        snapshotId: snapshotBId,
        participantId,
        answers: { Q1: 'answer-b' },
        merge: null,
      })

      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([sourceResponse])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([existingTargetResponse])
        }
        return Promise.resolve([])
      })

      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      expect(result.stats.responsesCreated).toBe(0)
      expect(result.stats.responsesAlreadyMerged).toBe(0)
      expect(result.stats.responsesSkippedParticipantDuplicate).toBe(1)
      expect(result.stats.sourceResponseCount).toBe(1)
    })

    test('should merge only the first source response for a participant not yet in target', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'
      const participantId = 'participant-1'

      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-b',
        snapshotId: snapshotBId,
      })

      // Two source responses share a participantId not yet present in target
      const firstResponse = new SurveyResponse({
        _id: 'response-first',
        surveyId,
        snapshotId: snapshotAId,
        participantId,
        answers: { Q1: 'answer-1' },
        merge: null,
      })

      const secondResponse = new SurveyResponse({
        _id: 'response-second',
        surveyId,
        snapshotId: snapshotAId,
        participantId,
        answers: { Q1: 'answer-2' },
        merge: null,
      })

      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([firstResponse, secondResponse])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      expect(result.stats.responsesCreated).toBe(1)
      expect(result.stats.responsesSkippedParticipantDuplicate).toBe(1)
      expect(result.stats.sourceResponseCount).toBe(2)
    })

    test('should never skip anonymous (null participantId) responses on this rule', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotAId = 'snapshot-a'
      const snapshotBId = 'snapshot-b'

      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      mockSurveySnapshotPartialRepo.findOne.mockImplementation(
        (query: MergeQuery) => {
          if (query._id === snapshotAId) {
            return Promise.resolve({ _id: snapshotAId, surveyId, projectId })
          }
          if (query._id === snapshotBId) {
            return Promise.resolve({ _id: snapshotBId, surveyId, projectId })
          }
          return Promise.resolve(null)
        },
      )

      mockSurveySnapshotRepo.findOne.mockImplementation(
        (_query: MergeQuery) => {
          return Promise.resolve({ survey: mockSurvey })
        },
      )

      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: 'publication-b',
        snapshotId: snapshotBId,
      })

      // Anonymous responses (no participantId) on both sides
      const anonymousSourceResponse = new SurveyResponse({
        _id: 'response-anon-source',
        surveyId,
        snapshotId: snapshotAId,
        participantId: null,
        answers: { Q1: 'answer-a' },
        merge: null,
      })

      const anonymousTargetResponse = new SurveyResponse({
        _id: 'response-anon-target',
        surveyId,
        snapshotId: snapshotBId,
        participantId: null,
        answers: { Q1: 'answer-b' },
        merge: null,
      })

      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.snapshotId === snapshotAId) {
          return Promise.resolve([anonymousSourceResponse])
        }
        if (query.snapshotId === snapshotBId) {
          return Promise.resolve([anonymousTargetResponse])
        }
        return Promise.resolve([])
      })

      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotBId,
        sourceSnapshotId: snapshotAId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      expect(result.stats.responsesCreated).toBe(1)
      expect(result.stats.responsesAlreadyMerged).toBe(0)
      expect(result.stats.responsesSkippedParticipantDuplicate).toBe(0)
    })
  })

  describe('identical snapshots (unchanged republish)', () => {
    test('copies responses from source publication to target publication when snapshot is unchanged', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotId = 'snapshot-shared'
      const sourcePublicationId = 'publication-old'
      const targetPublicationId = 'publication-new'

      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      mockSurveySnapshotPartialRepo.findOne.mockResolvedValue({
        _id: snapshotId,
        surveyId,
        projectId,
      })
      mockSurveySnapshotRepo.findOne.mockResolvedValue({ survey: mockSurvey })
      mockSurveyPublicationRepo.findOne.mockImplementation(
        (query: { _id?: string }) =>
          query._id === targetPublicationId
            ? Promise.resolve({ _id: targetPublicationId, snapshotId })
            : Promise.resolve(null),
      )

      const oldResponse = new SurveyResponse({
        _id: 'response-old',
        surveyId,
        snapshotId,
        publicationId: sourcePublicationId,
        answers: { Q1: 'answer' },
        merge: null,
      })

      // Responses on the target publication (none yet) vs source publication
      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.publicationId === sourcePublicationId) {
          return Promise.resolve([oldResponse])
        }
        if (query.publicationId === targetPublicationId) {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      const createdResponses: SurveyResponse[] = []
      mockSurveyResponseRepo.insertOne.mockImplementation(
        (response: SurveyResponse) => {
          createdResponses.push(response)
          return Promise.resolve()
        },
      )

      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotId,
        sourceSnapshotId: snapshotId,
        targetPublicationId,
        sourcePublicationId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: false } as MergeOptions,
      })

      expect(result.stats.responsesCreated).toBe(1)
      expect(result.stats.responsesAlreadyMerged).toBe(0)
      expect(createdResponses).toHaveLength(1)
      expect(createdResponses[0].publicationId).toBe(targetPublicationId)
      expect(createdResponses[0].snapshotId).toBe(snapshotId)
      expect(createdResponses[0].merge.origResponseId).toBe('response-old')
    })

    test('does not re-copy a response already merged into the target publication', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotId = 'snapshot-shared'
      const sourcePublicationId = 'publication-old'
      const targetPublicationId = 'publication-new'

      const mockSurvey = new Survey({
        _id: surveyId,
        title: { en: 'Test Survey' },
        elements: [
          { _id: 'q1', code: 'Q1', text: { en: 'Question 1' }, type: 'text' },
        ],
      })

      mockSurveySnapshotPartialRepo.findOne.mockResolvedValue({
        _id: snapshotId,
        surveyId,
        projectId,
      })
      mockSurveySnapshotRepo.findOne.mockResolvedValue({ survey: mockSurvey })
      mockSurveyPublicationRepo.findOne.mockImplementation(
        (query: { _id?: string }) =>
          query._id === targetPublicationId
            ? Promise.resolve({ _id: targetPublicationId, snapshotId })
            : Promise.resolve(null),
      )

      const oldResponse = new SurveyResponse({
        _id: 'response-old',
        surveyId,
        snapshotId,
        publicationId: sourcePublicationId,
        answers: { Q1: 'answer' },
        merge: null,
      })

      // Already copied once — target publication already has a response tracing
      // back to response-old via merge.origResponseId
      const alreadyCopiedResponse = new SurveyResponse({
        _id: 'response-copy-1',
        surveyId,
        snapshotId,
        publicationId: targetPublicationId,
        answers: { Q1: 'answer' },
        merge: {
          fromSnapshotId: snapshotId,
          origResponseId: 'response-old',
          at: new Date(),
        },
      })

      mockSurveyResponseRepo.find.mockImplementation((query: MergeQuery) => {
        if (query.publicationId === sourcePublicationId) {
          return Promise.resolve([oldResponse])
        }
        if (query.publicationId === targetPublicationId) {
          return Promise.resolve([alreadyCopiedResponse])
        }
        return Promise.resolve([])
      })

      const result = await service.merge({
        surveyId,
        projectId,
        targetSnapshotId: snapshotId,
        sourceSnapshotId: snapshotId,
        targetPublicationId,
        sourcePublicationId,
        aclConditions: { projectAdmin: [projectId] },
        options: { dryRun: true } as MergeOptions,
      })

      expect(result.stats.responsesCreated).toBe(0)
      expect(result.stats.responsesAlreadyMerged).toBe(1)
    })

    test('throws when snapshots are identical and no source publication is given', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotId = 'snapshot-shared'

      mockSurveySnapshotPartialRepo.findOne.mockResolvedValue({
        _id: snapshotId,
        surveyId,
        projectId,
      })

      let thrown: unknown
      try {
        await service.merge({
          surveyId,
          projectId,
          targetSnapshotId: snapshotId,
          sourceSnapshotId: snapshotId,
          aclConditions: { projectAdmin: [projectId] },
          options: { dryRun: true } as MergeOptions,
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeInstanceOf(Error)
      expect((thrown as Error).message).toBe(
        'Cannot merge a snapshot into itself',
      )
    })

    test('throws when source and target publication are the same', async () => {
      const surveyId = 'survey-123'
      const projectId = 'project-456'
      const snapshotId = 'snapshot-shared'
      const publicationId = 'publication-same'

      mockSurveySnapshotPartialRepo.findOne.mockResolvedValue({
        _id: snapshotId,
        surveyId,
        projectId,
      })
      mockSurveySnapshotRepo.findOne.mockResolvedValue({
        survey: new Survey({ _id: surveyId, title: { en: 'Test Survey' } }),
      })
      mockSurveyPublicationRepo.findOne.mockResolvedValue({
        _id: publicationId,
        snapshotId,
      })

      let thrown: unknown
      try {
        await service.merge({
          surveyId,
          projectId,
          targetSnapshotId: snapshotId,
          sourceSnapshotId: snapshotId,
          targetPublicationId: publicationId,
          sourcePublicationId: publicationId,
          aclConditions: { projectAdmin: [projectId] },
          options: { dryRun: true } as MergeOptions,
        })
      } catch (err) {
        thrown = err
      }

      expect(thrown).toBeInstanceOf(Error)
      expect((thrown as Error).message).toBe(
        'Cannot merge a publication into itself',
      )
    })
  })
})
