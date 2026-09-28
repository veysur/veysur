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

    service.config = {
      model: {
        app: {
          s3: {
            type: 'local',
            maxUploadSize: 10 * 1024 * 1024,
            localPath: '/tmp/veysur-test-uploads',
            publicBaseUrl: 'https://account.veysur.local',
            publicBucket: 'veysur-files',
            privateBucket: 'veysur-private',
            uploadSecret: 'test-secret-at-least-32-characters-long',
          },
        },
      },
    } as unknown as ServiceFile['config']
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
      const mockFiles = [
        new File({
          _id: 'file_1',
          responseId: 'resp_456',
          filePath: 'proj_123/file_1.pdf',
          bucketType: 'public',
        }),
      ]

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
      expect(result.files[0]).not.toHaveProperty('url')
      expect(result.pagination.total).toBe(1)
    })
  })

  describe('generateDownloadUrl', () => {
    test('signs against the private bucket for a private file', async () => {
      mockRepoFile.findOne.mockResolvedValue(
        new File({
          _id: 'file_1',
          filename: 'resume.pdf',
          filePath: 'proj_123/survey/survey_1/response/resp_1/resume_abc.pdf',
          bucketType: 'private',
          uploadedAt: new Date(),
        }),
      )

      const result = await service.generateDownloadUrl({
        fileId: 'file_1',
        projectId: 'proj_123',
      })

      expect(result.downloadUrl).toContain('/veysur-private/')
      expect(result.downloadUrl).toContain('?token=')
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    test('signs against the public bucket for a public file', async () => {
      mockRepoFile.findOne.mockResolvedValue(
        new File({
          _id: 'file_1',
          filename: 'logo.png',
          filePath: 'proj_123/logo_abc.png',
          bucketType: 'public',
          uploadedAt: new Date(),
        }),
      )

      const result = await service.generateDownloadUrl({
        fileId: 'file_1',
        projectId: 'proj_123',
      })

      expect(result.downloadUrl).toContain('/veysur-files/')
    })

    test('throws when the file is not found', async () => {
      mockRepoFile.findOne.mockResolvedValue(null)

      await expect(
        service.generateDownloadUrl({ fileId: 'file_1', projectId: 'proj_123' }),
      ).rejects.toThrow('File not found')
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
