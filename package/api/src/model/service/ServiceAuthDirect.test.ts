import { ServiceAuthDirect } from './ServiceAuthDirect'
import { Jwt } from 'acl/util/Jwt'
import { Client, ConfigJwt } from 'model'
import { User } from 'veysur-common'
import { asPrivate } from 'test-utils/asPrivate'

jest.mock('acl/util/Jwt', () => ({
  Jwt: { create: jest.fn().mockResolvedValue('signed.jwt.token') },
}))

jest.mock('model/common', () => ({
  lookupIp: jest.fn().mockResolvedValue(null),
}))

describe('ServiceAuthDirect', () => {
  let service: ServiceAuthDirect
  let mockRepoUserClient: {
    updateOne: jest.Mock
    insertOne: jest.Mock
    deleteMany: jest.Mock
    schema: { applyFilters: jest.Mock }
  }
  let mockRepoUser: { schema: { filterPrivate: jest.Mock } }

  const config = {
    model: {
      app: {
        jwt: { accessTokenTtlSeconds: 3600, adminLifetimeSeconds: 900 },
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers() // crypto + moment timing needs real setImmediate/Date

    service = new ServiceAuthDirect()
    asPrivate<typeof service, { config: typeof config }>(service).config =
      config

    mockRepoUserClient = {
      updateOne: jest.fn().mockResolvedValue(undefined),
      insertOne: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      schema: { applyFilters: jest.fn((data) => data) },
    }
    mockRepoUser = {
      schema: { filterPrivate: jest.fn() },
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        userClient: mockRepoUserClient,
        user: mockRepoUser,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    service.logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as typeof service.logger
  })

  afterEach(() => {
    jest.useFakeTimers()
  })

  describe('createJsonWebToken', () => {
    const baseUser = (overrides: Record<string, unknown> = {}) => ({
      _id: 'user_1',
      nameFirst: 'Jane',
      nameLast: 'Doe',
      email: 'jane@example.com',
      role: 'customer',
      twoFactorMeta: { enabled: false },
      projectOwn: [{ _id: 'proj_owned' }],
      projectAdmin: [{ projectId: 'proj_admin', _id: 'pa_1' }],
      ...overrides,
    })

    test('unverified email → project claims are empty, even though the user owns/administers projects', async () => {
      const user = baseUser({
        emailMeta: { verify: { status: { isVerified: false } } },
      })

      await service.createJsonWebToken(
        user as unknown as User,
        'client_1',
        {} as ConfigJwt,
      )

      const payload = (Jwt.create as jest.Mock).mock.calls[0][0]
      expect(payload.project).toEqual({})
    })

    test('verified email → owned and administered projects are both included with correct owner flags', async () => {
      const user = baseUser({
        emailMeta: { verify: { status: { isVerified: true } } },
      })

      await service.createJsonWebToken(
        user as unknown as User,
        'client_1',
        {} as ConfigJwt,
      )

      const payload = (Jwt.create as jest.Mock).mock.calls[0][0]
      expect(payload.project).toEqual({
        proj_owned: { owner: true },
        proj_admin: { owner: false },
      })
    })

    test('signs with the admin lifetime from config', async () => {
      const user = baseUser({
        emailMeta: { verify: { status: { isVerified: true } } },
      })

      await service.createJsonWebToken(
        user as unknown as User,
        'client_1',
        {} as ConfigJwt,
      )

      expect(Jwt.create).toHaveBeenCalledWith(expect.any(Object), {}, 900)
    })
  })

  describe('loginDirect', () => {
    const clientData = () => ({ _id: 'client_1', ip: '1.2.3.4' })

    test('brand new client (no matching client on user) creates a new access token and inserts a new client record', async () => {
      const user = {
        _id: 'user_1',
        client: [],
        emailMeta: { verify: { status: { isVerified: true } } },
      }

      const result = await service.loginDirect(
        user as unknown as User,
        clientData() as unknown as Client,
        {} as ConfigJwt,
        false,
      )

      expect(mockRepoUserClient.insertOne).toHaveBeenCalled()
      expect(mockRepoUserClient.updateOne).not.toHaveBeenCalledWith(
        { _id: 'client_1' },
        expect.anything(),
      )
      expect(result.accessToken).toBeDefined()
      expect(result.jwt).toBeDefined()
    })

    test('login (not refresh) on an existing client always issues a fresh access token', async () => {
      const farFutureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const user = {
        _id: 'user_1',
        client: [
          {
            _id: 'client_1',
            accessToken: [{ token: 'old-token', expiresAt: farFutureExpiry }],
          },
        ],
        emailMeta: { verify: { status: { isVerified: true } } },
      }

      await service.loginDirect(
        user as unknown as User,
        clientData() as unknown as Client,
        {} as ConfigJwt,
        false,
      )

      const updateArg = mockRepoUserClient.updateOne.mock.calls[0][1]
      // a brand new token was prepended — the old one is demoted, not reused
      expect(updateArg.$set.accessToken[0].token).not.toBe('old-token')
    })

    test('refresh with a token that is not close to expiry reuses the existing access token', async () => {
      const farFutureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const user = {
        _id: 'user_1',
        client: [
          {
            _id: 'client_1',
            accessToken: [
              { token: 'existing-token', expiresAt: farFutureExpiry },
            ],
          },
        ],
        emailMeta: { verify: { status: { isVerified: true } } },
      }

      const result = await service.loginDirect(
        user as unknown as User,
        clientData() as unknown as Client,
        {} as ConfigJwt,
        true, // isRefresh
      )

      expect(result.accessToken.token).toBe('existing-token')
    })

    test('refresh with a token expiring within a day forces rotation to a new access token', async () => {
      const almostExpired = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      const user = {
        _id: 'user_1',
        client: [
          {
            _id: 'client_1',
            accessToken: [
              { token: 'almost-expired-token', expiresAt: almostExpired },
            ],
          },
        ],
        emailMeta: { verify: { status: { isVerified: true } } },
      }

      const result = await service.loginDirect(
        user as unknown as User,
        clientData() as unknown as Client,
        {} as ConfigJwt,
        true,
      )

      expect(result.accessToken.token).not.toBe('almost-expired-token')
    })

    test('prunes user clients beyond MAX_CLIENTS (5), keeping only the most recent', async () => {
      const now = Date.now()
      const clients = Array.from({ length: 7 }, (_, i) => ({
        _id: `client_${i}`,
        createdAt: new Date(now - i * 1000), // client_0 is most recent
        accessToken: [],
      }))
      const user = {
        _id: 'user_1',
        client: clients,
        emailMeta: { verify: { status: { isVerified: true } } },
      }

      await service.loginDirect(
        user as unknown as User,
        { _id: 'client_0', ip: '1.2.3.4' } as unknown as Client,
        {} as ConfigJwt,
        false,
      )

      expect(mockRepoUserClient.deleteMany).toHaveBeenCalled()
      const deleteArg = mockRepoUserClient.deleteMany.mock.calls[0][0]
      expect(deleteArg.userId).toBe('user_1')
    })

    test('filters private user fields before returning', async () => {
      const user = {
        _id: 'user_1',
        client: [],
        emailMeta: { verify: { status: { isVerified: true } } },
      }

      await service.loginDirect(
        user as unknown as User,
        clientData() as unknown as Client,
        {} as ConfigJwt,
        false,
      )

      expect(mockRepoUser.schema.filterPrivate).toHaveBeenCalledWith(
        user,
        'read',
      )
    })
  })
})
