import { ServiceFile } from './ServiceFile'
import { File } from 'veysur-common'

describe('ServiceFile', () => {
  let service: ServiceFile
  let mockRepoFile: {
    findOne: jest.Mock
    find: jest.Mock
    count: jest.Mock
    findBySurvey: jest.Mock
    findByResponse: jest.Mock
  }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceFile()

    mockRepoFile = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      findBySurvey: jest.fn(),
      findByResponse: jest.fn(),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { file: mockRepoFile }
      return map[name] ?? {}
    }) as typeof service.getRepo)
  })

  describe('getOne', () => {
    test('should get file by ID and projectId', async () => {
      const mockFile = {
        _id: 'file_1',
        filename: 'test.pdf',
        uploadedAt: new Date(),
        deletedAt: null,
      } as File

      mockRepoFile.findOne.mockResolvedValue(mockFile)

      const result = await service.getOne({
        fileId: 'file_1',
        projectId: 'proj_123',
      })

      expect(mockRepoFile.findOne).toHaveBeenCalledWith(
        {
          _id: 'file_1',
          uploadedAt: { $ne: null },
          deletedAt: null,
        },
        expect.objectContaining({
          context: expect.any(Object),
        }),
      )
      expect(result).toEqual(mockFile)
    })

    test('should throw error if file not found', async () => {
      mockRepoFile.findOne.mockResolvedValue(null)

      await expect(
        service.getOne({
          fileId: 'file_1',
          projectId: 'proj_123',
        }),
      ).rejects.toThrow('File not found')
    })
  })

  describe('getAll', () => {
    test('should get all files for a project with pagination', async () => {
      const mockFiles = [{ _id: 'file_1' }, { _id: 'file_2' }] as File[]

      mockRepoFile.find.mockResolvedValue(mockFiles)
      mockRepoFile.count.mockResolvedValue(2)

      const result = await service.getAll({
        projectId: 'proj_123',
        page: 1,
        perPage: 50,
      })

      expect(mockRepoFile.find).toHaveBeenCalledWith(
        {
          uploadedAt: { $ne: null },
          deletedAt: null,
        },
        expect.objectContaining({
          context: expect.any(Object),
          sort: { createdAt: -1 },
          skip: 0,
          limit: 50,
        }),
      )
      expect(result.files).toEqual(mockFiles)
      expect(result.pagination.total).toBe(2)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.perPage).toBe(50)
      expect(result.pagination.totalPages).toBe(1)
    })
  })

  describe('getFilesForSurvey', () => {
    test('should call repo.findBySurvey with correct parameters', async () => {
      const mockFiles = [
        { _id: 'file_1', surveyId: 'survey_123' },
        { _id: 'file_2', surveyId: 'survey_123' },
      ] as File[]

      mockRepoFile.findBySurvey.mockResolvedValue({
        files: mockFiles,
        total: 2,
      })

      const result = await service.getFilesForSurvey({
        surveyId: 'survey_123',
        projectId: 'proj_123',
        page: 1,
        perPage: 50,
      })

      expect(mockRepoFile.findBySurvey).toHaveBeenCalledWith(
        'survey_123',
        {
          page: 1,
          perPage: 50,
        },
        expect.objectContaining({
          context: expect.any(Object),
        }),
      )
      expect(result.files).toEqual(mockFiles)
      expect(result.pagination.total).toBe(2)
    })
  })

  describe('getFilesForResponse', () => {
    test('should call repo.findByResponse with correct parameters', async () => {
      const mockFiles = [{ _id: 'file_1', responseId: 'resp_456' }] as File[]

      mockRepoFile.findByResponse.mockResolvedValue({
        files: mockFiles,
        total: 1,
      })

      const result = await service.getFilesForResponse({
        surveyId: 'survey_123',
        responseId: 'resp_456',
        projectId: 'proj_123',
        page: 1,
        perPage: 50,
      })

      expect(mockRepoFile.findByResponse).toHaveBeenCalledWith(
        'survey_123',
        'resp_456',
        {
          page: 1,
          perPage: 50,
        },
        expect.objectContaining({
          context: expect.any(Object),
        }),
      )
      expect(result.files).toEqual(mockFiles)
      expect(result.pagination.total).toBe(1)
    })
  })

  describe('getFileUrl', () => {
    test('should return file URL', () => {
      const mockFile = {
        _id: 'file_1',
        getUrl: jest.fn().mockReturnValue('http://localhost:3000/files/file_1'),
      } as unknown as File

      const result = service.getFileUrl({
        file: mockFile,
        baseUrl: 'http://localhost:3000',
      })

      expect(mockFile.getUrl).toHaveBeenCalledWith('http://localhost:3000')
      expect(result).toBe('http://localhost:3000/files/file_1')
    })
  })
})
