import * as OTPAuth from 'otpauth'
import { ServiceTwoFactor, PreAuthJwtPayload } from './ServiceTwoFactor'
import { ConfigJwt } from 'model'
import { asPrivate } from 'test-utils/asPrivate'
import { buildMockServiceProject } from 'test-utils/buildMockServiceProject'

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockBcrypt = require('bcryptjs') as { compare: jest.Mock }

describe('ServiceTwoFactor', () => {
  let service: ServiceTwoFactor
  let mockRepoUser: { findOne: jest.Mock; updateOne: jest.Mock }
  let mockServiceAuthDirect: { loginDirect: jest.Mock }
  let mockEventLog: { log: jest.Mock }

  const jwtConfig: ConfigJwt = { key: 'secret', algorithm: 'HS256' }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServiceTwoFactor()
    asPrivate<typeof service, { config: unknown }>(service).config = {
      model: { app: { brandName: 'VeySur', companyName: 'Veysur Limited' } },
    }

    mockRepoUser = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    }

    mockServiceAuthDirect = {
      loginDirect: jest.fn(),
    }

    mockEventLog = {
      log: jest.fn(),
    }

    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      if (name === 'user') return mockRepoUser
      return {}
    }) as typeof service.getRepo)

    const mockServiceProject = buildMockServiceProject()
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      if (name === 'authDirect') return mockServiceAuthDirect
      if (name === 'project') return mockServiceProject
      return {}
    }) as typeof service.getService)
    asPrivate<typeof service, { modelManager: unknown }>(service).modelManager =
      {
        services: { eventLog: mockEventLog },
      }
  })

  // ── verifyCode (private, tested via public methods) ─────────────────────────

  describe('verifyAndEnable', () => {
    test('enables 2FA when correct code supplied', async () => {
      const secret = new OTPAuth.Secret()
      const totp = new OTPAuth.TOTP({
        secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      })
      const code = totp.generate()

      mockRepoUser.updateOne.mockResolvedValue(undefined)

      await service.verifyAndEnable({
        code,
        secret: secret.base32,
        aclContext: { jwt: { _id: 'user_1' } },
      })

      expect(mockRepoUser.updateOne).toHaveBeenCalledWith(
        { _id: 'user_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            twoFactorSecret: secret.base32,
            'twoFactorMeta.enabled': true,
          }),
        }),
      )
    })

    test('throws INVALID_CODE when code is wrong', async () => {
      const secret = new OTPAuth.Secret()

      await expect(
        service.verifyAndEnable({
          code: '000000',
          secret: secret.base32,
          aclContext: { jwt: { _id: 'user_1' } },
        }),
      ).rejects.toMatchObject({ ref: 'INVALID_CODE' })

      expect(mockRepoUser.updateOne).not.toHaveBeenCalled()
    })
  })

  // ── generateSetupData ────────────────────────────────────────────────────────

  describe('generateSetupData', () => {
    test('returns a valid otpauth URI and base32 secret', async () => {
      mockRepoUser.findOne.mockResolvedValue({
        _id: 'user_1',
        email: 'test@example.com',
      })

      const result = await service.generateSetupData({
        aclContext: { jwt: { _id: 'user_1' } },
      })

      expect(result.secret).toMatch(/^[A-Z2-7]+=*$/)
      expect(result.otpauthUri).toMatch(/^otpauth:\/\/totp\//)
      expect(result.otpauthUri).toContain('test%40example.com')
      expect(result.otpauthUri).toContain('issuer=VeySur')
    })

    test('throws when user not found', async () => {
      mockRepoUser.findOne.mockResolvedValue(null)

      await expect(
        service.generateSetupData({ aclContext: { jwt: { _id: 'missing' } } }),
      ).rejects.toBeDefined()
    })
  })

  // ── verifyLogin ─────────────────────────────────────────────────────────────

  describe('verifyLogin', () => {
    function makePreAuthJwt(userId: string): PreAuthJwtPayload {
      return {
        _id: userId,
        clientId: 'client_1',
        type: 'pre-auth',
        ip: '1.2.3.4',
        userAgent: 'test-agent',
        deviceName: 'Test Device',
        deviceSystem: 'iOS',
        deviceSystemVersion: '17',
        buildNumber: '100',
        buildVersion: '1.0.0',
        notificationToken: undefined,
      }
    }

    test('completes login with correct TOTP code', async () => {
      const secret = new OTPAuth.Secret()
      const totp = new OTPAuth.TOTP({
        secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      })
      const code = totp.generate()

      const mockUser = {
        _id: 'user_1',
        twoFactorSecret: secret.base32,
        twoFactorMeta: { enabled: true },
        client: [],
      }
      mockRepoUser.findOne.mockResolvedValue(mockUser)
      mockServiceAuthDirect.loginDirect.mockResolvedValue({
        jwt: 'jwt_token',
        user: mockUser,
      })
      mockEventLog.log.mockResolvedValue(undefined)

      const result = await service.verifyLogin({
        code,
        jwtConfig,
        aclContext: { jwt: makePreAuthJwt('user_1') },
      })

      expect(mockServiceAuthDirect.loginDirect).toHaveBeenCalled()
      expect(result).toMatchObject({ jwt: 'jwt_token' })
    })

    test('rejects with INVALID_CODE for wrong code', async () => {
      const secret = new OTPAuth.Secret()
      const mockUser = {
        _id: 'user_1',
        twoFactorSecret: secret.base32,
        twoFactorMeta: { enabled: true },
        client: [],
      }
      mockRepoUser.findOne.mockResolvedValue(mockUser)
      mockEventLog.log.mockResolvedValue(undefined)

      await expect(
        service.verifyLogin({
          code: '000000',
          jwtConfig,
          aclContext: { jwt: makePreAuthJwt('user_1') },
        }),
      ).rejects.toMatchObject({ ref: 'INVALID_CODE' })

      expect(mockServiceAuthDirect.loginDirect).not.toHaveBeenCalled()
    })

    test('rejects with TWO_FACTOR_NOT_ENABLED when 2FA is disabled', async () => {
      const mockUser = {
        _id: 'user_1',
        twoFactorSecret: null,
        twoFactorMeta: { enabled: false },
        client: [],
      }
      mockRepoUser.findOne.mockResolvedValue(mockUser)

      await expect(
        service.verifyLogin({
          code: '123456',
          jwtConfig,
          aclContext: { jwt: makePreAuthJwt('user_1') },
        }),
      ).rejects.toMatchObject({ ref: 'TWO_FACTOR_NOT_ENABLED' })
    })

    test('rejects when user not found', async () => {
      mockRepoUser.findOne.mockResolvedValue(null)

      await expect(
        service.verifyLogin({
          code: '123456',
          jwtConfig,
          aclContext: { jwt: makePreAuthJwt('missing') },
        }),
      ).rejects.toBeDefined()
    })
  })

  // ── disable ──────────────────────────────────────────────────────────────────

  describe('disable', () => {
    test('clears secret and enabled flag when password is correct', async () => {
      mockRepoUser.findOne.mockResolvedValue({ password: 'hashed' })
      mockRepoUser.updateOne.mockResolvedValue(undefined)
      mockBcrypt.compare.mockResolvedValue(true)

      await service.disable({
        password: 'correct',
        aclContext: { jwt: { _id: 'user_1' } },
      })

      expect(mockRepoUser.updateOne).toHaveBeenCalledWith(
        { _id: 'user_1' },
        {
          $set: {
            twoFactorSecret: null,
            'twoFactorMeta.enabled': false,
            'twoFactorMeta.enabledAt': null,
          },
        },
      )
    })

    test('rejects with bad request when password is incorrect', async () => {
      mockRepoUser.findOne.mockResolvedValue({ password: 'hashed' })
      mockBcrypt.compare.mockResolvedValue(false)

      await expect(
        service.disable({
          password: 'wrong',
          aclContext: { jwt: { _id: 'user_1' } },
        }),
      ).rejects.toBeDefined()

      expect(mockRepoUser.updateOne).not.toHaveBeenCalled()
    })
  })

  // ── dismissPrompt ─────────────────────────────────────────────────────────────

  describe('dismissPrompt', () => {
    test('sets prompt.dismissed to true', async () => {
      mockRepoUser.updateOne.mockResolvedValue(undefined)

      await service.dismissPrompt({ aclContext: { jwt: { _id: 'user_1' } } })

      expect(mockRepoUser.updateOne).toHaveBeenCalledWith(
        { _id: 'user_1' },
        { $set: { 'twoFactorMeta.prompt.dismissed': true } },
      )
    })
  })
})
