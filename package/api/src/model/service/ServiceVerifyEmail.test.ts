import { ServiceVerifyEmail } from './ServiceVerifyEmail'
import { asPrivate } from 'test-utils/asPrivate'

describe('ServiceVerifyEmail', () => {
  let service: ServiceVerifyEmail
  let mockRepoUser: { updateOne: jest.Mock }
  let mockServiceEmail: { frequencyLimit: jest.Mock; send: jest.Mock }

  const config = {
    model: {
      app: {
        emailVerifyTokenTtlSeconds: 900,
        accountDomain: 'account.veysur.local',
        accountBasePath: '',
      },
    },
  }

  const user = {
    _id: 'user_1',
    email: 'jane@example.com',
    nameFirst: 'Jane',
    emailMeta: {
      verify: { status: { isVerified: false, isVerifiedAt: null }, token: [] },
      history: [],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceVerifyEmail()

    mockRepoUser = {
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { user: mockRepoUser }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    mockServiceEmail = {
      frequencyLimit: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
    }
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { email: mockServiceEmail }
      return map[name] ?? {}
    }) as typeof service.getService)

    asPrivate<typeof service, { config: typeof config }>(service).config =
      config
  })

  describe('sendForUser', () => {
    test('builds a subdomain verify URL under the default (non-self-hosted) config', async () => {
      await service.sendForUser(user)

      expect(mockServiceEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            verifyUrl: expect.stringMatching(
              /^https:\/\/account\.veysur\.local\/verify-email\?/,
            ),
          }),
        }),
      )
    })

    test('builds a path-prefixed verify URL under a self-hosted (single-domain) config', async () => {
      asPrivate<typeof service, { config: typeof config }>(service).config = {
        model: {
          app: {
            ...config.model.app,
            accountDomain: 'veysur.local',
            accountBasePath: '/account',
          },
        },
      }

      await service.sendForUser(user)

      expect(mockServiceEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            verifyUrl: expect.stringMatching(
              /^https:\/\/veysur\.local\/account\/verify-email\?/,
            ),
          }),
        }),
      )
    })
  })
})
