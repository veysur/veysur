import * as bcryptjs from 'bcryptjs'
import { ServiceAuthEmailPassword } from './ServiceAuthEmailPassword'
import { asPrivate } from 'test-utils/asPrivate'

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

describe('ServiceAuthEmailPassword', () => {
  let service: ServiceAuthEmailPassword
  let mockRepoUser: { findOne: jest.Mock }
  let mockEventLog: { log: jest.Mock }
  let mockServiceTwoFactor: { createPreAuthJwt: jest.Mock }
  let mockServiceAuthDirect: { loginDirect: jest.Mock }

  const loginArgs = (overrides: Record<string, unknown> = {}) => ({
    email: 'jane@example.com',
    password: 'Str0ngP@ssw0rd!',
    clientId: 'client_1',
    ip: '1.2.3.4',
    jwtConfig: {},
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceAuthEmailPassword()

    mockRepoUser = { findOne: jest.fn() }
    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { user: mockRepoUser }
      return map[name] ?? {}
    }) as typeof service.getRepo)

    mockEventLog = { log: jest.fn().mockResolvedValue(undefined) }
    asPrivate<typeof service, { modelManager: unknown }>(service).modelManager =
      {
        services: { eventLog: mockEventLog },
      }

    mockServiceTwoFactor = {
      createPreAuthJwt: jest.fn().mockResolvedValue({ preAuth: true }),
    }
    mockServiceAuthDirect = {
      loginDirect: jest.fn().mockResolvedValue({ jwt: 'signed-token' }),
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
        twoFactor: mockServiceTwoFactor,
        authDirect: mockServiceAuthDirect,
        project: mockServiceProject,
      }
      return map[name] ?? {}
    }) as typeof service.getService)
  })

  test('unknown email throws unauthorized without comparing a password', async () => {
    mockRepoUser.findOne.mockResolvedValue(null)

    await expect(service.login(loginArgs())).rejects.toMatchObject({
      ref: 'UNAUTHORIZED',
    })
    expect(bcryptjs.compare).not.toHaveBeenCalled()
  })

  test('user with no password set (e.g. OAuth-only account) throws unauthorized', async () => {
    mockRepoUser.findOne.mockResolvedValue({ _id: 'user_1', password: null })

    await expect(service.login(loginArgs())).rejects.toMatchObject({
      ref: 'UNAUTHORIZED',
    })
  })

  test('wrong password throws unauthorized and does not log the user in', async () => {
    mockRepoUser.findOne.mockResolvedValue({ _id: 'user_1', password: 'hash' })
    ;(bcryptjs.compare as jest.Mock).mockResolvedValue(false)

    await expect(service.login(loginArgs())).rejects.toMatchObject({
      ref: 'UNAUTHORIZED',
    })
    expect(mockEventLog.log).not.toHaveBeenCalled()
    expect(mockServiceAuthDirect.loginDirect).not.toHaveBeenCalled()
  })

  test('correct password, no 2FA, non-platform role → logs in directly', async () => {
    mockRepoUser.findOne.mockResolvedValue({
      _id: 'user_1',
      password: 'hash',
      role: 'customer',
      twoFactorMeta: { enabled: false },
    })
    ;(bcryptjs.compare as jest.Mock).mockResolvedValue(true)

    const result = await service.login(loginArgs())

    expect(mockEventLog.log).toHaveBeenCalledWith({
      action: 'user.login',
      userId: 'user_1',
    })
    expect(mockServiceAuthDirect.loginDirect).toHaveBeenCalled()
    expect(mockServiceTwoFactor.createPreAuthJwt).not.toHaveBeenCalled()
    expect(result).toEqual({ jwt: 'signed-token' })
  })

  test('correct password with 2FA enabled → returns pre-auth challenge, does not log in directly', async () => {
    mockRepoUser.findOne.mockResolvedValue({
      _id: 'user_1',
      password: 'hash',
      role: 'customer',
      twoFactorMeta: { enabled: true },
    })
    ;(bcryptjs.compare as jest.Mock).mockResolvedValue(true)

    const result = await service.login(loginArgs())

    expect(mockServiceTwoFactor.createPreAuthJwt).toHaveBeenCalledWith(
      'user_1',
      expect.any(Object),
      {},
    )
    expect(mockServiceAuthDirect.loginDirect).not.toHaveBeenCalled()
    expect(result).toEqual({ preAuth: true })
  })

  test('platform role without 2FA still requires pre-auth (forced 2FA gate)', async () => {
    mockRepoUser.findOne.mockResolvedValue({
      _id: 'user_1',
      password: 'hash',
      role: 'platformAdmin',
      twoFactorMeta: { enabled: false },
    })
    ;(bcryptjs.compare as jest.Mock).mockResolvedValue(true)

    const result = await service.login(loginArgs())

    expect(mockServiceTwoFactor.createPreAuthJwt).toHaveBeenCalledWith(
      'user_1',
      expect.any(Object),
      {},
      true,
    )
    expect(mockServiceAuthDirect.loginDirect).not.toHaveBeenCalled()
    expect(result).toEqual({ preAuth: true })
  })
})
