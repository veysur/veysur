import { asPrivate } from 'test-utils/asPrivate'

import { ServiceSettingSurvey } from './ServiceSettingSurvey'

jest.mock('model', () => ({}))

describe('ServiceSettingSurvey.patch', () => {
  test('refreshes the embed pointers of the project after saving', async () => {
    const service = new ServiceSettingSurvey()
    const updateOne = jest.fn().mockResolvedValue(undefined)
    const refreshProject = jest.fn().mockResolvedValue(undefined)
    jest
      .spyOn(service, 'getRepo')
      .mockImplementation((() => ({ updateOne })) as typeof service.getRepo)
    Object.defineProperty(service, 'modelManager', {
      value: { services: { surveyEmbedArtefact: { refreshProject } } },
      writable: true,
    })

    await service.patch({
      projectId: 'proj_1',
      patches: [
        {
          type: 'settingSurvey',
          action: 'update',
          data: { 'presentation.noBrand': true },
        },
      ],
    })

    expect(updateOne).toHaveBeenCalled()
    expect(refreshProject).toHaveBeenCalledWith({ projectId: 'proj_1' })
  })
})

describe('ServiceSettingSurvey bot protection secrets', () => {
  const stored = {
    provider: 'cloudflare',
    cloudflare: { siteKey: 'site', secretKey: 'stored-secret' },
    google: { siteKey: '', secretKey: '' },
  }

  const makeService = () => {
    const service = new ServiceSettingSurvey()
    const repo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ _id: 's1', botProtection: stored }),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    jest
      .spyOn(service, 'getRepo')
      .mockImplementation((() => repo) as typeof service.getRepo)
    Object.defineProperty(service, 'modelManager', {
      value: {
        services: {
          surveyEmbedArtefact: {
            refreshProject: jest.fn().mockResolvedValue(undefined),
          },
        },
      },
      writable: true,
    })
    asPrivate<typeof service, { config: unknown }>(service).config = {
      model: {
        app: {
          maps: { providerDefault: 'google', googleApiKey: 'deploy-key' },
        },
      },
    }
    return { service, repo }
  }

  test('getOne never returns a secret key but says whether one is stored', async () => {
    const { service } = makeService()

    const result = await service.getOne({
      projectId: 'proj_1',
      aclConditions: undefined,
    })

    expect(JSON.stringify(result)).not.toContain('stored-secret')
    expect(result.botProtection.cloudflare).toEqual({
      siteKey: 'site',
      secretKey: '',
      hasSecret: true,
    })
  })

  test('getOne adds the maps config resolved against the deployment', async () => {
    const { service, repo } = makeService()
    repo.findOne.mockResolvedValue({
      _id: 's1',
      botProtection: stored,
      maps: { googleApiKey: '' },
    })

    const result = await service.getOne({
      projectId: 'proj_1',
      aclConditions: undefined,
    })

    expect(result.effective.maps).toEqual({
      provider: 'google',
      googleApiKey: 'deploy-key',
    })
    expect(result.maps).toEqual({ googleApiKey: '' })
  })

  test('patch keeps the stored secret when the form leaves it blank', async () => {
    const { service, repo } = makeService()

    await service.patch({
      projectId: 'proj_1',
      patches: [
        {
          type: 'settingSurvey',
          action: 'update',
          data: {
            botProtection: {
              provider: 'cloudflare',
              cloudflare: { siteKey: 'new-site', secretKey: '' },
            },
          },
        },
      ],
    })

    const [, update] = repo.updateOne.mock.calls[0]
    expect(update.$set.botProtection.cloudflare).toEqual({
      siteKey: 'new-site',
      secretKey: 'stored-secret',
    })
  })
})
