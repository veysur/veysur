import { DEFAULT_PROJECT_ID } from 'veysur-common'
import { ServiceProject } from './ServiceProject'
import { asPrivate } from 'test-utils/asPrivate'

function buildService(configuredProject: {
  name: string
  timezone: string
  ownerId: string
}) {
  const service = new ServiceProject()

  const mockRepoProject = {
    findOne: jest.fn(),
    insertOne: jest.fn().mockResolvedValue(undefined),
    updateOne: jest.fn().mockResolvedValue(undefined),
  }
  service.repos = {
    project: mockRepoProject,
  } as unknown as typeof service.repos

  asPrivate<
    ServiceProject,
    { config: { model: { app: { project: typeof configuredProject } } } }
  >(service).config = { model: { app: { project: configuredProject } } }

  return { service, mockRepoProject }
}

describe('ServiceProject', () => {
  const configuredProject = {
    name: 'My Project',
    timezone: 'Europe/London',
    ownerId: 'user-1',
  }

  describe('ensureLoaded', () => {
    it('creates the row from config when none exists', async () => {
      const { service, mockRepoProject } = buildService(configuredProject)
      mockRepoProject.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          _id: DEFAULT_PROJECT_ID,
          ...configuredProject,
        })

      const project = await service.ensureLoaded()

      expect(mockRepoProject.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: DEFAULT_PROJECT_ID,
          name: configuredProject.name,
          timezone: configuredProject.timezone,
          ownerId: configuredProject.ownerId,
        }),
      )
      expect(project).toEqual(
        expect.objectContaining({
          _id: DEFAULT_PROJECT_ID,
          name: configuredProject.name,
          timezone: configuredProject.timezone,
          ownerId: configuredProject.ownerId,
        }),
      )
    })

    it('syncs ownerId from config without touching name/timezone when the row already exists', async () => {
      const { service, mockRepoProject } = buildService(configuredProject)
      const existing = {
        _id: DEFAULT_PROJECT_ID,
        name: 'Renamed Project',
        timezone: 'Etc/UTC',
        ownerId: 'stale-owner',
      }
      mockRepoProject.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          ownerId: configuredProject.ownerId,
        })

      const project = await service.ensureLoaded()

      expect(mockRepoProject.insertOne).not.toHaveBeenCalled()
      expect(mockRepoProject.updateOne).toHaveBeenCalledWith(
        { _id: DEFAULT_PROJECT_ID },
        {
          $set: expect.objectContaining({ ownerId: configuredProject.ownerId }),
        },
      )
      expect(project.name).toBe('Renamed Project')
      expect(project.timezone).toBe('Etc/UTC')
      expect(project.ownerId).toBe(configuredProject.ownerId)
    })

    it('does not touch the row when the config ownerId already matches', async () => {
      const { service, mockRepoProject } = buildService(configuredProject)
      mockRepoProject.findOne.mockResolvedValueOnce({
        _id: DEFAULT_PROJECT_ID,
        ...configuredProject,
      })

      await service.ensureLoaded()

      expect(mockRepoProject.insertOne).not.toHaveBeenCalled()
      expect(mockRepoProject.updateOne).not.toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('lazily loads and returns the cached project for the default project id', async () => {
      const { service, mockRepoProject } = buildService(configuredProject)
      mockRepoProject.findOne.mockResolvedValueOnce({
        _id: DEFAULT_PROJECT_ID,
        ...configuredProject,
      })

      const project = await service.getById(DEFAULT_PROJECT_ID)

      expect(project).toEqual(
        expect.objectContaining({
          _id: DEFAULT_PROJECT_ID,
          name: configuredProject.name,
          timezone: configuredProject.timezone,
          ownerId: configuredProject.ownerId,
        }),
      )
    })

    it('returns null for any other project id', async () => {
      const { service } = buildService(configuredProject)
      const project = await service.getById('some-other-id')
      expect(project).toBeNull()
    })
  })

  describe('updateTimezone', () => {
    it('persists the new timezone and updates the cache', async () => {
      const { service, mockRepoProject } = buildService(configuredProject)
      mockRepoProject.findOne.mockResolvedValueOnce({
        _id: DEFAULT_PROJECT_ID,
        ...configuredProject,
      })
      await service.getById(DEFAULT_PROJECT_ID)

      const updated = await service.updateTimezone({
        projectId: DEFAULT_PROJECT_ID,
        timezone: 'America/New_York',
      })

      expect(mockRepoProject.updateOne).toHaveBeenCalledWith(
        { _id: DEFAULT_PROJECT_ID },
        { $set: expect.objectContaining({ timezone: 'America/New_York' }) },
      )
      expect(updated.timezone).toBe('America/New_York')
    })

    it('rejects any project id other than the default', async () => {
      const { service } = buildService(configuredProject)

      await expect(
        service.updateTimezone({ projectId: 'other', timezone: 'Etc/UTC' }),
      ).rejects.toMatchObject({ userMessage: 'Project not found' })
    })
  })

  describe('isOwner', () => {
    it('is true for the loaded owner', async () => {
      const { service, mockRepoProject } = buildService(configuredProject)
      mockRepoProject.findOne.mockResolvedValueOnce({
        _id: DEFAULT_PROJECT_ID,
        ...configuredProject,
      })
      await service.ensureLoaded()

      expect(service.isOwner(configuredProject.ownerId)).toBe(true)
    })

    it('is false for any other user', async () => {
      const { service, mockRepoProject } = buildService(configuredProject)
      mockRepoProject.findOne.mockResolvedValueOnce({
        _id: DEFAULT_PROJECT_ID,
        ...configuredProject,
      })
      await service.ensureLoaded()

      expect(service.isOwner('someone-else')).toBe(false)
    })

    it('is false when the project has not been loaded yet', () => {
      const { service } = buildService(configuredProject)
      expect(service.isOwner(configuredProject.ownerId)).toBe(false)
    })
  })
})
