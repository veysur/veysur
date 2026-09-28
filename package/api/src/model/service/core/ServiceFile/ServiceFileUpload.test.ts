import { ServiceFileUpload } from './ServiceFileUpload'

describe('ServiceFileUpload', () => {
  let service: ServiceFileUpload

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceFileUpload()

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
            uploadSecret: 'test-secret',
          },
        },
      },
    } as unknown as ServiceFileUpload['config']

    jest.spyOn(service, 'getRepo').mockImplementation((() => ({
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      findByHashWithContext: jest
        .fn()
        .mockResolvedValue({ file: null, contextMatches: false }),
      create: jest.fn().mockResolvedValue(undefined),
    })) as typeof service.getRepo)
  })

  describe('generateUploadUrl', () => {
    it('rejects a disallowed mimeType before touching storage or the repo', async () => {
      await expect(
        service.generateUploadUrl({
          projectId: 'project1',
          filename: 'evil.html',
          fileHash: 'a'.repeat(64),
          fileSize: 100,
          mimeType: 'text/html',
          aclContext: { jwt: { _id: 'user1' } },
        }),
      ).rejects.toThrow('mimeType "text/html" is not an allowed upload type')
    })

    it('rejects image/svg+xml', async () => {
      await expect(
        service.generateUploadUrl({
          projectId: 'project1',
          filename: 'evil.svg',
          fileHash: 'a'.repeat(64),
          fileSize: 100,
          mimeType: 'image/svg+xml',
          aclContext: { jwt: { _id: 'user1' } },
        }),
      ).rejects.toThrow(
        'mimeType "image/svg+xml" is not an allowed upload type',
      )
    })

    it('writes fileContext "response" uploads to the private bucket', async () => {
      const result = await service.generateUploadUrl({
        projectId: 'project1',
        filename: 'resume.pdf',
        fileHash: 'a'.repeat(64),
        fileSize: 100,
        mimeType: 'application/pdf',
        surveyId: 'survey1',
        responseId: 'response1',
        fileContext: 'response',
        aclContext: { jwt: { _id: 'user1' } },
      })

      expect(result.uploadUrl).toContain('/api/file/upload/veysur-private/')
      expect(result.file?.bucketType).toBe('private')
    })

    it('writes fileContext "survey" uploads to the public bucket', async () => {
      const result = await service.generateUploadUrl({
        projectId: 'project1',
        filename: 'attachment.pdf',
        fileHash: 'b'.repeat(64),
        fileSize: 100,
        mimeType: 'application/pdf',
        surveyId: 'survey1',
        fileContext: 'survey',
        aclContext: { jwt: { _id: 'user1' } },
      })

      expect(result.uploadUrl).toContain('/api/file/upload/veysur-files/')
      expect(result.file?.bucketType).toBe('public')
    })
  })
})
