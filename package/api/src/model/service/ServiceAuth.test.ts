import { ServiceAuth } from './ServiceAuth'
import { asPrivate } from 'test-utils/asPrivate'

describe('ServiceAuth', () => {
  let service: ServiceAuth
  let mockRepoUser: { findOne: jest.Mock; schema: { filterPrivate: jest.Mock } }
  let mockRepoUserClient: { updateOne: jest.Mock; find: jest.Mock }
  let mockEventLog: { log: jest.Mock }
  let mockServiceAuthDirect: { loginDirect: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceAuth()

    mockRepoUser = {
      findOne: jest.fn(),
      schema: { filterPrivate: jest.fn() },
    }
    mockRepoUserClient = {
      updateOne: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        user: mockRepoUser,
        userClient: mockRepoUserClient,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    mockEventLog = { log: jest.fn().mockResolvedValue(undefined) }
    asPrivate<typeof service, { modelManager: unknown }>(service).modelManager =
      {
        services: { eventLog: mockEventLog },
      }

    mockServiceAuthDirect = {
      loginDirect: jest.fn().mockResolvedValue({ jwt: 'refreshed-token' }),
    }
    const mockServiceProject = {
      getById: jest.fn().mockResolvedValue({
        _id: 'default',
        name: 'Project',
        ownerId: 'nobody',
      }),
    }
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        authDirect: mockServiceAuthDirect,
        project: mockServiceProject,
      }
      return map[name] ?? {}
    }) as typeof service.getService)
  })

  describe('refresh', () => {
    test('with an access token, re-issues a fresh JWT via loginDirect', async () => {
      mockRepoUser.findOne.mockResolvedValue({ _id: 'user_1' })

      const result = await service.refresh({
        aclContext: {
          client: { _id: 'client_1', userId: 'user_1' },
          accessToken: 'existing-token',
        },
        ip: '1.2.3.4',
        jwtConfig: {},
      })

      expect(mockServiceAuthDirect.loginDirect).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'user_1',
          projectOwn: [],
          projectAdmin: [],
        }),
        expect.objectContaining({ _id: 'client_1', ip: '1.2.3.4' }),
        {},
        true,
      )
      expect(result).toEqual({ jwt: 'refreshed-token' })
    })

    test('without an access token, returns the filtered user with a null access token', async () => {
      const user = { _id: 'user_1', password: 'secret-hash' }
      mockRepoUser.findOne.mockResolvedValue(user)

      const result = await service.refresh({
        aclContext: { client: { _id: 'client_1', userId: 'user_1' } },
        ip: '1.2.3.4',
        jwtConfig: {},
      })

      expect(mockRepoUser.schema.filterPrivate).toHaveBeenCalledWith(
        user,
        'read',
      )
      expect(mockServiceAuthDirect.loginDirect).not.toHaveBeenCalled()
      expect(result).toEqual({ user, accessToken: null })
    })
  })

  describe('delete (logout)', () => {
    test('no client on aclContext throws NotFound', async () => {
      await expect(
        service.delete({ aclContext: { client: null } }),
      ).rejects.toThrow()
      expect(mockRepoUserClient.updateOne).not.toHaveBeenCalled()
    })

    test('expires all future-dated access tokens and clears notification token', async () => {
      const future = new Date(Date.now() + 100000)
      const past = new Date(Date.now() - 100000)
      const client = {
        _id: 'client_1',
        userId: 'user_1',
        accessToken: [{ expiresAt: future }, { expiresAt: past }],
        notificationToken: 'push-token',
      }

      const result = await service.delete({ aclContext: { client } })

      expect(result).toBe(true)
      // the future token got expired, the already-past one is untouched
      expect(client.accessToken[0].expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now(),
      )
      expect(client.accessToken[1].expiresAt).toEqual(past)
      expect(client.notificationToken).toBeNull()
      expect(mockRepoUserClient.updateOne).toHaveBeenCalledWith(
        { _id: 'client_1' },
        { $set: client },
      )
      expect(mockEventLog.log).toHaveBeenCalledWith({
        action: 'user.logout',
        userId: 'user_1',
      })
    })
  })

  describe('revokeAllForUser', () => {
    test('expires future-dated tokens across every client and logs once', async () => {
      const future = new Date(Date.now() + 100000)
      const clients = [
        {
          _id: 'client_1',
          userId: 'user_1',
          accessToken: [{ expiresAt: future }],
          notificationToken: 'push-1',
        },
        {
          _id: 'client_2',
          userId: 'user_1',
          accessToken: [{ expiresAt: future }],
          notificationToken: 'push-2',
        },
      ]
      mockRepoUserClient.find.mockResolvedValue(clients)

      await service.revokeAllForUser('user_1')

      expect(mockRepoUserClient.find).toHaveBeenCalledWith({
        userId: 'user_1',
      })
      expect(clients[0].accessToken[0].expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now(),
      )
      expect(clients[0].notificationToken).toBeNull()
      expect(clients[1].notificationToken).toBeNull()
      expect(mockRepoUserClient.updateOne).toHaveBeenCalledTimes(2)
      expect(mockEventLog.log).toHaveBeenCalledWith({
        action: 'user.sessionsRevoked',
        userId: 'user_1',
      })
    })
  })
})
