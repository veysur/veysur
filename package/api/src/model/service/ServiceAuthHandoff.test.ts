import { ServiceAuthHandoff } from './ServiceAuthHandoff'
import { buildMockServiceProject } from 'test-utils/buildMockServiceProject'
import { authHandoffStore } from 'service/auth-handoff/AuthHandoffStore'

jest.mock('service/auth-handoff/AuthHandoffStore', () => ({
  authHandoffStore: {
    mint: jest.fn(),
    redeem: jest.fn(),
  },
}))

describe('ServiceAuthHandoff', () => {
  let service: ServiceAuthHandoff
  let mockRepoUser: { findOne: jest.Mock }
  let mockRepoUserClient: { findOne: jest.Mock }
  let mockServiceAuthDirect: { loginDirect: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceAuthHandoff()

    mockRepoUser = { findOne: jest.fn() }
    mockRepoUserClient = { findOne: jest.fn() }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        user: mockRepoUser,
        userClient: mockRepoUserClient,
      }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    mockServiceAuthDirect = {
      loginDirect: jest.fn().mockResolvedValue({ jwt: { token: 'fresh-jwt' } }),
    }
    const mockServiceProject = buildMockServiceProject()
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = {
        authDirect: mockServiceAuthDirect,
        project: mockServiceProject,
      }
      return map[name] ?? {}
    }) as typeof service.getService)
  })

  describe('create', () => {
    test('derives the user from the JWT-authenticated request context, never from client input', async () => {
      mockRepoUser.findOne.mockResolvedValue({ _id: 'user_1' })
      mockRepoUserClient.findOne.mockResolvedValue({ _id: 'client_1' })
      ;(authHandoffStore.mint as jest.Mock).mockResolvedValue({
        token: 'tok_1',
        expiresAt: new Date('2026-01-01T00:00:00Z'),
      })

      const result = await service.create({
        aclContext: { jwt: { _id: 'user_1', clientId: 'client_1' } },
        ip: '1.2.3.4',
        jwtConfig: {},
        rememberMe: true,
        // A malicious caller could try to smuggle their own auth payload in
        // the request body - create() must ignore it entirely.
        auth: { jwt: { token: 'attacker-supplied' } },
      })

      expect(mockRepoUser.findOne).toHaveBeenCalledWith(
        { _id: 'user_1' },
        expect.objectContaining({ populate: expect.any(Object) }),
      )
      expect(mockServiceAuthDirect.loginDirect).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'user_1' }),
        expect.objectContaining({ _id: 'client_1', ip: '1.2.3.4' }),
        {},
        true,
      )
      expect(authHandoffStore.mint).toHaveBeenCalledWith({
        auth: { jwt: { token: 'fresh-jwt' } },
        rememberMe: true,
      })
      expect(result).toEqual({
        token: 'tok_1',
        expiresAt: new Date('2026-01-01T00:00:00Z'),
      })
    })

    test('derives the user from an access-token-authenticated request context', async () => {
      mockRepoUser.findOne.mockResolvedValue({ _id: 'user_1' })
      ;(authHandoffStore.mint as jest.Mock).mockResolvedValue({
        token: 'tok_2',
        expiresAt: new Date(),
      })

      await service.create({
        aclContext: {
          client: { _id: 'client_1', userId: 'user_1' },
          accessToken: 'existing-token',
        },
        ip: '1.2.3.4',
        jwtConfig: {},
        rememberMe: false,
      })

      expect(mockRepoUser.findOne).toHaveBeenCalledWith(
        { _id: 'user_1' },
        expect.any(Object),
      )
      expect(mockRepoUserClient.findOne).not.toHaveBeenCalled()
      expect(mockServiceAuthDirect.loginDirect).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'user_1' }),
        expect.objectContaining({ _id: 'client_1', ip: '1.2.3.4' }),
        {},
        true,
      )
    })

    test('throws NotFound when the request carries no resolvable user', async () => {
      await expect(
        service.create({ aclContext: {}, ip: '1.2.3.4', jwtConfig: {} }),
      ).rejects.toThrow()
      expect(mockServiceAuthDirect.loginDirect).not.toHaveBeenCalled()
    })
  })

  describe('redeem', () => {
    test('returns the payload the store yields', async () => {
      const payload = { auth: { jwt: { token: 'x' } }, rememberMe: true }
      ;(authHandoffStore.redeem as jest.Mock).mockResolvedValue(payload)

      const result = await service.redeem({ token: 'tok_1' })

      expect(authHandoffStore.redeem).toHaveBeenCalledWith('tok_1')
      expect(result).toEqual(payload)
    })

    test('throws NotFound when the token is missing/expired/already used', async () => {
      ;(authHandoffStore.redeem as jest.Mock).mockResolvedValue(null)

      await expect(service.redeem({ token: 'stale' })).rejects.toThrow()
    })
  })
})
