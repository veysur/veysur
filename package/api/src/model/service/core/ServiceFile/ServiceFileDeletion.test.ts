import { DEFAULT_PROJECT_ID } from 'veysur-common'
import { ServiceFileDeletion } from './ServiceFileDeletion'

describe('ServiceFileDeletion', () => {
  const originalDeploymentMode = process.env.DEPLOYMENT_MODE

  afterEach(() => {
    process.env.DEPLOYMENT_MODE = originalDeploymentMode
  })

  describe('hardDeleteAll', () => {
    // Regression test: this previously called `this.getRepo('project').find({})`
    // unconditionally, which throws in self-hosted — there is no `project` repo in
    // that edition (single, config-sourced project — see `model/service/ServiceProject.ts`).
    // This is wired up as a recurring scheduled task, so the bug fired on every run.
    it('processes the single default project in self-hosted, without a project repo', async () => {
      process.env.DEPLOYMENT_MODE = 'self-hosted'
      const service = new ServiceFileDeletion()

      jest.spyOn(service, 'getRepo').mockImplementation((() => {
        throw new Error(
          'getRepo("project") should not be called in self-hosted',
        )
      }) as typeof service.getRepo)

      const hardDelete = jest.spyOn(service, 'hardDelete').mockResolvedValue({
        success: true,
        deletedCount: 3,
        s3DeletedCount: 3,
        dbDeletedCount: 3,
        cutoffDate: new Date(),
      })

      const result = await service.hardDeleteAll({ olderThan: 'PT1H' })

      expect(hardDelete).toHaveBeenCalledTimes(1)
      expect(hardDelete).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: DEFAULT_PROJECT_ID }),
      )
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          totalDeletedCount: 3,
          projectsProcessed: 1,
          projectsFailed: 0,
        }),
      )
    })

    it('processes every project from the project repo in the cloud edition', async () => {
      process.env.DEPLOYMENT_MODE = 'cloud'
      const service = new ServiceFileDeletion()

      const mockRepoProject = {
        find: jest
          .fn()
          .mockResolvedValue([{ _id: 'proj_1' }, { _id: 'proj_2' }]),
      }
      jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
        const map: Record<string, unknown> = { project: mockRepoProject }
        return map[name]
      }) as typeof service.getRepo)

      const hardDelete = jest.spyOn(service, 'hardDelete').mockResolvedValue({
        success: true,
        deletedCount: 1,
        s3DeletedCount: 1,
        dbDeletedCount: 1,
        cutoffDate: new Date(),
      })

      const result = await service.hardDeleteAll({ olderThan: 'PT1H' })

      expect(mockRepoProject.find).toHaveBeenCalledTimes(1)
      expect(hardDelete).toHaveBeenCalledTimes(2)
      expect(hardDelete).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ projectId: 'proj_1' }),
      )
      expect(hardDelete).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ projectId: 'proj_2' }),
      )
      expect(result.projectsProcessed).toBe(2)
    })
  })
})
