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
          },
        },
      },
    } as unknown as ServiceFileUpload['config']

    jest.spyOn(service, 'getRepo').mockImplementation((() => ({
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
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
  })
})
