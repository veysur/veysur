import * as bcryptjs from 'bcryptjs'
import { ServicePassword } from './ServicePassword'
import { asPrivate } from 'test-utils/asPrivate'

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}))

describe('ServicePassword', () => {
  let service: ServicePassword
  let mockRepoUser: { findOne: jest.Mock; updateOne: jest.Mock }
  let mockServiceEmail: { frequencyLimit: jest.Mock; send: jest.Mock }
  let mockEventLog: { log: jest.Mock }

  const config = {
    model: {
      app: {
        passwordResetTokenTtlSeconds: 900,
        accountDomain: 'account.veysur.local',
        accountBasePath: '',
        bcryptSaltRounds: 10,
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    service = new ServicePassword()

    mockRepoUser = {
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue(undefined),
    }
    service.repos = { user: mockRepoUser } as unknown as typeof service.repos

    mockServiceEmail = {
      frequencyLimit: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
    }
    jest.spyOn(service, 'getService').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { email: mockServiceEmail }
      return map[name] ?? {}
    }) as typeof service.getService)

    mockEventLog = { log: jest.fn().mockResolvedValue(undefined) }
    asPrivate<typeof service, { modelManager: unknown }>(service).modelManager =
      {
        services: { eventLog: mockEventLog },
      }
    asPrivate<typeof service, { config: typeof config }>(service).config =
      config
  })

  describe('generateToken', () => {
    test('returns a 6-digit numeric token with ttl and expiry derived from config', () => {
      const fixedNow = new Date('2024-06-15T12:00:00Z')
      jest.setSystemTime(fixedNow)

      const result = service.generateToken()

      expect(result.token).toMatch(/^\d{6}$/)
      expect(result.ttl).toBe(900)
      expect(result.failCount).toBe(0)
      expect(result.expiresAt.getTime()).toBe(fixedNow.getTime() + 900 * 1000)
    })
  })

  describe('resetEmail', () => {
    test('unknown email throws NotFound without sending an email', async () => {
      mockRepoUser.findOne.mockResolvedValue(null)

      await expect(
        service.resetEmail({ email: 'ghost@example.com' }),
      ).rejects.toMatchObject({ ref: 'USER_NOT_FOUND' })

      expect(mockServiceEmail.send).not.toHaveBeenCalled()
    })

    test('known email stores a new reset token and sends the reset email', async () => {
      const user = {
        _id: 'user_1',
        email: 'jane@example.com',
        nameFirst: 'Jane',
        passwordMeta: { reset: { token: [] } },
      }
      mockRepoUser.findOne.mockResolvedValue(user)

      await service.resetEmail({ email: 'jane@example.com' })

      expect(mockRepoUser.updateOne).toHaveBeenCalledWith(
        { _id: 'user_1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            'passwordMeta.reset.token': expect.arrayContaining([
              expect.objectContaining({
                token: expect.stringMatching(/^\d{6}$/),
              }),
            ]),
          }),
        }),
      )
      expect(mockServiceEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'password-reset',
          to: 'jane@example.com',
          templateData: expect.objectContaining({
            resetUrl: expect.stringMatching(
              /^https:\/\/account\.veysur\.local\/password-reset\?/,
            ),
          }),
        }),
      )
    })

    test('builds a path-prefixed reset URL under a self-hosted (single-domain) config', async () => {
      asPrivate<typeof service, { config: typeof config }>(service).config = {
        model: {
          app: {
            ...config.model.app,
            accountDomain: 'veysur.local',
            accountBasePath: '/account',
          },
        },
      }
      mockRepoUser.findOne.mockResolvedValue({
        _id: 'user_1',
        email: 'jane@example.com',
        nameFirst: 'Jane',
        passwordMeta: { reset: { token: [] } },
      })

      await service.resetEmail({ email: 'jane@example.com' })

      expect(mockServiceEmail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            resetUrl: expect.stringMatching(
              /^https:\/\/veysur\.local\/account\/password-reset\?/,
            ),
          }),
        }),
      )
    })

    test('keeps only the 3 most recent reset tokens', async () => {
      const user = {
        _id: 'user_1',
        email: 'jane@example.com',
        nameFirst: 'Jane',
        passwordMeta: {
          reset: {
            token: [
              { token: '111111' },
              { token: '222222' },
              { token: '333333' },
            ],
          },
        },
      }
      mockRepoUser.findOne.mockResolvedValue(user)

      await service.resetEmail({ email: 'jane@example.com' })

      const updateArg = mockRepoUser.updateOne.mock.calls[0][1]
      const tokens = updateArg.$set['passwordMeta.reset.token']
      expect(tokens).toHaveLength(3)
      expect(tokens[1].token).toBe('111111')
      expect(tokens[2].token).toBe('222222')
    })

    test('rate limiting rejection propagates and blocks the reset', async () => {
      mockServiceEmail.frequencyLimit.mockRejectedValue(
        new Error('Too many requests'),
      )

      await expect(
        service.resetEmail({ email: 'jane@example.com' }),
      ).rejects.toThrow('Too many requests')

      expect(mockRepoUser.findOne).not.toHaveBeenCalled()
    })
  })

  describe('put', () => {
    const baseUser = (overrides: Record<string, unknown> = {}) => ({
      _id: 'user_1',
      passwordMeta: {
        reset: {
          token: [
            {
              token: '123456',
              expiresAt: new Date('2099-01-01T00:00:00Z'),
              failCount: 0,
            },
          ],
        },
      },
      ...overrides,
    })

    test('unknown email throws Unauthorized', async () => {
      mockRepoUser.findOne.mockResolvedValue(null)

      await expect(
        service.put({
          email: 'ghost@example.com',
          token: '123456',
          password: 'x',
        }),
      ).rejects.toMatchObject({ ref: 'USER_NOT_FOUND' })
    })

    test('token that does not match any stored token increments failCount and throws BadRequest', async () => {
      mockRepoUser.findOne.mockResolvedValue(baseUser())

      await expect(
        service.put({
          email: 'jane@example.com',
          token: '999999',
          password: 'Str0ngP@ssw0rd!',
        }),
      ).rejects.toMatchObject({ ref: 'INVALID_TOKEN' })

      const updateArg = mockRepoUser.updateOne.mock.calls[0][1]
      expect(updateArg.$set['passwordMeta.reset.token'][0].failCount).toBe(1)
    })

    test('token with failCount already at the max throws TOO_MANY_ATTEMPTS', async () => {
      mockRepoUser.findOne.mockResolvedValue(
        baseUser({
          passwordMeta: {
            reset: {
              token: [
                {
                  token: '123456',
                  expiresAt: new Date('2099-01-01T00:00:00Z'),
                  failCount: 3,
                },
              ],
            },
          },
        }),
      )

      await expect(
        service.put({
          email: 'jane@example.com',
          token: '123456',
          password: 'Str0ngP@ssw0rd!',
        }),
      ).rejects.toMatchObject({ ref: 'TOO_MANY_ATTEMPTS' })
    })

    test('expired token throws EXPIRED', async () => {
      mockRepoUser.findOne.mockResolvedValue(
        baseUser({
          passwordMeta: {
            reset: {
              token: [
                {
                  token: '123456',
                  expiresAt: new Date('2000-01-01T00:00:00Z'),
                  failCount: 0,
                },
              ],
            },
          },
        }),
      )

      await expect(
        service.put({
          email: 'jane@example.com',
          token: '123456',
          password: 'Str0ngP@ssw0rd!',
        }),
      ).rejects.toMatchObject({ ref: 'EXPIRED' })
    })

    test('valid token but weak password throws INVALID_PASSWORD without hashing', async () => {
      mockRepoUser.findOne.mockResolvedValue(baseUser())

      await expect(
        service.put({
          email: 'jane@example.com',
          token: '123456',
          password: 'weak',
        }),
      ).rejects.toMatchObject({ ref: 'INVALID_PASSWORD' })

      expect(bcryptjs.hash).not.toHaveBeenCalled()
    })

    test('valid token and strong password hashes and stores it, clears reset tokens, logs event', async () => {
      mockRepoUser.findOne.mockResolvedValue(baseUser())

      await service.put({
        email: 'jane@example.com',
        token: '123456',
        password: 'Str0ngP@ssw0rd!',
      })

      expect(bcryptjs.hash).toHaveBeenCalledWith('Str0ngP@ssw0rd!', 10)
      expect(mockRepoUser.updateOne).toHaveBeenCalledWith(
        { _id: 'user_1' },
        {
          $set: {
            password: 'hashed-password',
            'passwordMeta.reset.token': [],
          },
        },
      )
      expect(mockEventLog.log).toHaveBeenCalledWith({
        action: 'user.password.reset',
        userId: 'user_1',
      })
    })
  })
})
