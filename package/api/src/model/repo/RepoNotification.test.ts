import { RepoNotification } from './RepoNotification'

describe('RepoNotification', () => {
  let repo: RepoNotification

  beforeEach(() => {
    repo = new RepoNotification()
    jest.spyOn(repo, 'find').mockImplementation()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findByRecipient', () => {
    test('excludes dismissed notifications so a dismissed row does not reappear on refetch', async () => {
      ;(repo.find as jest.Mock).mockResolvedValue([])

      await repo.findByRecipient({
        projectId: 'project-1',
        recipientUserId: 'user-1',
        limit: 20,
        offset: 0,
      })

      expect(repo.find).toHaveBeenCalledWith(
        {
          projectId: 'project-1',
          recipientUserId: 'user-1',
          status: { $ne: 'dismissed' },
        },
        {
          sort: { createdAt: -1 },
          limit: 20,
          offset: 0,
          populate: { dataTransferJob: true },
        },
      )
    })
  })
})
