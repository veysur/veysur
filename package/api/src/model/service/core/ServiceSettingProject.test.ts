import { ServiceSettingProject } from './ServiceSettingProject'

jest.mock('model', () => ({}))

describe('ServiceSettingProject', () => {
  const stored = {
    _id: 's1',
    maps: { googleApiKey: 'stored-maps-key' },
    botProtection: {
      provider: 'cloudflare',
      cloudflare: { siteKey: 'site', secretKey: 'stored-secret' },
      google: { siteKey: '', secretKey: '' },
    },
  }

  const makeService = ({
    withEncryption = true,
    existing = stored as typeof stored | null,
  } = {}) => {
    const service = new ServiceSettingProject()
    const created = { ...stored, _id: 'created' }
    const repo = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockResolvedValue(created),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    const refreshProject = jest.fn().mockResolvedValue(undefined)
    jest
      .spyOn(service, 'getRepo')
      .mockImplementation((() => repo) as typeof service.getRepo)
    Object.defineProperty(service, 'modelManager', {
      value: {
        config: { encryptionService: withEncryption ? {} : undefined },
        services: { surveyEmbedArtefact: { refreshProject } },
      },
      writable: true,
    })
    return { service, repo, refreshProject }
  }

  test('getOne never returns a secret key but says whether one is stored', async () => {
    const { service } = makeService()

    const result = await service.getOne({ projectId: 'proj_1' })

    expect(JSON.stringify(result)).not.toContain('stored-secret')
    expect(result.botProtection.cloudflare).toEqual({
      siteKey: 'site',
      secretKey: '',
      hasSecret: true,
    })
    expect(result.maps.googleApiKey).toBe('stored-maps-key')
  })

  test('getOne creates the document when the project has none', async () => {
    const { service, repo } = makeService({ existing: null })

    const result = await service.getOne({ projectId: 'proj_1' })

    expect(repo.create).toHaveBeenCalled()
    expect(result._id).toBe('created')
  })

  test('updateMaps stores the key and refreshes the embed pointers', async () => {
    const { service, repo, refreshProject } = makeService()

    await service.updateMaps({
      projectId: 'proj_1',
      maps: { googleApiKey: 'new-key' },
    })

    const [, update] = repo.updateOne.mock.calls[0]
    expect(update.$set.maps).toEqual({ googleApiKey: 'new-key' })
    expect(refreshProject).toHaveBeenCalledWith({ projectId: 'proj_1' })
  })

  test('updateBotProtection keeps the stored secret when the form leaves it blank', async () => {
    const { service, repo, refreshProject } = makeService()

    await service.updateBotProtection({
      projectId: 'proj_1',
      botProtection: {
        provider: 'cloudflare',
        cloudflare: { siteKey: 'new-site', secretKey: '' },
      },
    })

    const [, update] = repo.updateOne.mock.calls[0]
    expect(update.$set.botProtection.cloudflare).toEqual({
      siteKey: 'new-site',
      secretKey: 'stored-secret',
    })
    expect(refreshProject).toHaveBeenCalledWith({ projectId: 'proj_1' })
  })

  test('updateBotProtection refuses a secret key when no encryption key is configured', async () => {
    const { service, repo, refreshProject } = makeService({
      withEncryption: false,
    })

    await expect(
      service.updateBotProtection({
        projectId: 'proj_1',
        botProtection: {
          provider: 'cloudflare',
          cloudflare: { siteKey: 'site', secretKey: 'new-secret' },
        },
      }),
    ).rejects.toThrow('encryption key')
    expect(repo.updateOne).not.toHaveBeenCalled()
    expect(refreshProject).not.toHaveBeenCalled()
  })
})
