import { RepoDataTransferJob } from './RepoDataTransferJob'

describe('RepoDataTransferJob', () => {
  let repo: RepoDataTransferJob

  beforeEach(() => {
    repo = new RepoDataTransferJob()
    jest.spyOn(repo, 'find').mockImplementation()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findStale', () => {
    test('queries wedged pending jobs by createdAt and wedged processing jobs by startedAt', async () => {
      ;(repo.find as jest.Mock).mockResolvedValue([])
      const cutoff = new Date('2026-09-25T00:00:00.000Z')

      await repo.findStale(cutoff)

      expect(repo.find).toHaveBeenCalledWith({
        $or: [
          { status: 'pending', createdAt: { $lte: cutoff } },
          { status: 'processing', startedAt: { $lte: cutoff } },
        ],
      })
    })
  })
})
