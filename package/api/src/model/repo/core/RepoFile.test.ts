import { RepoFile } from './RepoFile'
import { File } from 'veysur-common'

describe('RepoFile', () => {
  let repo: RepoFile

  beforeEach(() => {
    repo = new RepoFile()

    // Mock the find, findOne, and count methods
    jest.spyOn(repo, 'find').mockImplementation()
    jest.spyOn(repo, 'findOne').mockImplementation()
    jest.spyOn(repo, 'count').mockImplementation()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findBySurvey', () => {
    const surveyId = 'survey_123'

    test('should query files with surveyId and fileContext=survey', async () => {
      const mockFiles = [
        { _id: 'file_1', surveyId, fileContext: 'survey' },
        { _id: 'file_2', surveyId, fileContext: 'survey' },
      ] as File[]

      ;(repo.find as jest.Mock).mockResolvedValue(mockFiles)
      ;(repo.count as jest.Mock).mockResolvedValue(2)

      const result = await repo.findBySurvey(surveyId)

      expect(repo.find).toHaveBeenCalledWith(
        { surveyId, fileContext: 'survey', deletedAt: null },
        { sort: { createdAt: -1 }, skip: 0, limit: 50 },
      )
      expect(repo.count).toHaveBeenCalledWith(
        {
          surveyId,
          fileContext: 'survey',
          deletedAt: null,
        },
        undefined,
      )
      expect(result.files).toEqual(mockFiles)
      expect(result.total).toBe(2)
    })

    test('should support pagination', async () => {
      const mockFiles = [{ _id: 'file_3', surveyId }] as File[]

      ;(repo.find as jest.Mock).mockResolvedValue(mockFiles)
      ;(repo.count as jest.Mock).mockResolvedValue(10)

      const result = await repo.findBySurvey(surveyId, { page: 2, perPage: 5 })

      expect(repo.find).toHaveBeenCalledWith(
        { surveyId, fileContext: 'survey', deletedAt: null },
        { sort: { createdAt: -1 }, skip: 5, limit: 5 },
      )
      expect(result.files.length).toBe(1)
      expect(result.total).toBe(10)
    })

    test('should handle empty results', async () => {
      ;(repo.find as jest.Mock).mockResolvedValue([])
      ;(repo.count as jest.Mock).mockResolvedValue(0)

      const result = await repo.findBySurvey(surveyId)

      expect(result.files).toEqual([])
      expect(result.total).toBe(0)
    })

    test('should default to page 1 and perPage 50', async () => {
      ;(repo.find as jest.Mock).mockResolvedValue([])
      ;(repo.count as jest.Mock).mockResolvedValue(0)

      await repo.findBySurvey(surveyId, {})

      expect(repo.find).toHaveBeenCalledWith(expect.any(Object), {
        sort: { createdAt: -1 },
        skip: 0,
        limit: 50,
      })
    })
  })

  describe('findByResponse', () => {
    const surveyId = 'survey_123'
    const responseId = 'resp_456'

    test('should query files with surveyId, responseId and fileContext=response', async () => {
      const mockFiles = [
        { _id: 'file_1', surveyId, responseId, fileContext: 'response' },
      ] as File[]

      ;(repo.find as jest.Mock).mockResolvedValue(mockFiles)
      ;(repo.count as jest.Mock).mockResolvedValue(1)

      const result = await repo.findByResponse(surveyId, responseId)

      expect(repo.find).toHaveBeenCalledWith(
        { surveyId, responseId, fileContext: 'response', deletedAt: null },
        { sort: { createdAt: -1 }, skip: 0, limit: 50 },
      )
      expect(repo.count).toHaveBeenCalledWith(
        {
          surveyId,
          responseId,
          fileContext: 'response',
          deletedAt: null,
        },
        undefined,
      )
      expect(result.files).toEqual(mockFiles)
      expect(result.total).toBe(1)
    })

    test('should support pagination', async () => {
      ;(repo.find as jest.Mock).mockResolvedValue([])
      ;(repo.count as jest.Mock).mockResolvedValue(15)

      const result = await repo.findByResponse(surveyId, responseId, {
        page: 3,
        perPage: 10,
      })

      expect(repo.find).toHaveBeenCalledWith(
        { surveyId, responseId, fileContext: 'response', deletedAt: null },
        { sort: { createdAt: -1 }, skip: 20, limit: 10 },
      )
      expect(result.total).toBe(15)
    })

    test('should require both surveyId and responseId', async () => {
      ;(repo.find as jest.Mock).mockResolvedValue([])
      ;(repo.count as jest.Mock).mockResolvedValue(0)

      await repo.findByResponse(surveyId, responseId)

      const findCall = (repo.find as jest.Mock).mock.calls[0][0]
      expect(findCall).toHaveProperty('surveyId', surveyId)
      expect(findCall).toHaveProperty('responseId', responseId)
    })
  })

  describe('countReferences', () => {
    const hash = 'a1b2c3d4e5f6g7h8'

    test('should count files with same hash in project', async () => {
      ;(repo.count as jest.Mock).mockResolvedValue(3)

      const count = await repo.countReferences(hash)

      expect(repo.count).toHaveBeenCalledWith({ hash })
      expect(count).toBe(3)
    })

    test('should return 0 when no references exist', async () => {
      ;(repo.count as jest.Mock).mockResolvedValue(0)

      const count = await repo.countReferences(hash)

      expect(count).toBe(0)
    })

    test('should return 1 when only one reference exists', async () => {
      ;(repo.count as jest.Mock).mockResolvedValue(1)

      const count = await repo.countReferences(hash)

      expect(count).toBe(1)
    })
  })

  describe('findByHash', () => {
    const hash = 'a1b2c3d4e5f6g7h8'

    test('should find file by hash', async () => {
      const mockFile = { _id: 'file_1', hash } as File

      ;(repo.findOne as jest.Mock).mockResolvedValue(mockFile)

      const file = await repo.findByHash(hash)

      expect(repo.findOne).toHaveBeenCalledWith({ hash })
      expect(file).toEqual(mockFile)
    })

    test('should return null when file not found', async () => {
      ;(repo.findOne as jest.Mock).mockResolvedValue(null)

      const file = await repo.findByHash(hash)

      expect(file).toBeNull()
    })
  })

  describe('Query Performance', () => {
    test('should efficiently query survey files using indexes', async () => {
      // This test validates that the queries are structured correctly
      // The actual index usage is verified by MongoDB query performance
      const mockFiles = [{ _id: 'file_1' }] as File[]
      ;(repo.find as jest.Mock).mockResolvedValue(mockFiles)
      ;(repo.count as jest.Mock).mockResolvedValue(1)

      await repo.findBySurvey('survey_123')

      // Verify the query uses the indexed fields
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          surveyId: 'survey_123',
          fileContext: 'survey',
        }),
        expect.any(Object),
      )
    })

    test('should efficiently query response files using indexes', async () => {
      const mockFiles = [{ _id: 'file_1' }] as File[]
      ;(repo.find as jest.Mock).mockResolvedValue(mockFiles)
      ;(repo.count as jest.Mock).mockResolvedValue(1)

      await repo.findByResponse('survey_123', 'resp_456')

      // Verify the query uses the indexed fields
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          surveyId: 'survey_123',
          responseId: 'resp_456',
          fileContext: 'response',
        }),
        expect.any(Object),
      )
    })

    test('should use hash index for deduplication queries', async () => {
      ;(repo.findOne as jest.Mock).mockResolvedValue(null)

      await repo.findByHash('abc123')

      // Verify the query uses the indexed fields
      expect(repo.findOne).toHaveBeenCalledWith({
        hash: 'abc123',
      })
    })
  })
})
