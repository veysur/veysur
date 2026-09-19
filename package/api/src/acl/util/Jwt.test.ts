// cspell:ignore Nlcjpw
import { Jwt } from './Jwt'

const jwtConfig = { key: 'test-secret-key', algorithm: 'HS256' as const }

describe('Jwt', () => {
  beforeAll(() => {
    // jsonwebtoken's callback path relies on setImmediate, which the
    // project's global fake timers otherwise never advance.
    jest.useRealTimers()
  })

  afterAll(() => {
    jest.useFakeTimers()
  })

  describe('create + verify', () => {
    test('a token created with create() verifies successfully and round-trips the payload', async () => {
      const token = await Jwt.create(
        { _id: 'user_1', role: 'customer' },
        jwtConfig,
        3600,
      )

      const payload = await Jwt.verify(token, jwtConfig)

      expect(payload._id).toBe('user_1')
      expect(payload.role).toBe('customer')
    })

    test('verify rejects a token signed with a different key', async () => {
      const token = await Jwt.create({ _id: 'user_1' }, jwtConfig, 3600)

      await expect(
        Jwt.verify(token, { key: 'wrong-key', algorithm: 'HS256' }),
      ).rejects.toThrow()
    })

    test('verify rejects a tampered token', async () => {
      const token = await Jwt.create({ _id: 'user_1' }, jwtConfig, 3600)
      const [header, , signature] = token.split('.')
      const tamperedPayload = Buffer.from(
        JSON.stringify({ _id: 'attacker' }),
      ).toString('base64url')
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`

      await expect(Jwt.verify(tamperedToken, jwtConfig)).rejects.toThrow()
    })

    test('verify rejects an expired token', async () => {
      const token = await Jwt.create({ _id: 'user_1' }, jwtConfig, -1)

      await expect(Jwt.verify(token, jwtConfig)).rejects.toThrow(/expired/i)
    })

    test('verify rejects a malformed token string', async () => {
      await expect(Jwt.verify('not-a-real-token', jwtConfig)).rejects.toThrow()
    })
  })

  describe('regex', () => {
    test('matches a well-formed JWT', async () => {
      const token = await Jwt.create({ _id: 'user_1' }, jwtConfig, 3600)
      expect(Jwt.regex.test(token)).toBe(true)
    })

    test('rejects an obviously non-JWT string', () => {
      expect(Jwt.regex.test('plain text with spaces')).toBe(false)
    })
  })

  describe('parseRequest', () => {
    const makeRequest = (
      headerValue: string | undefined,
      query: { access_token?: string } = {},
    ) => ({
      get: jest.fn().mockReturnValue(headerValue),
      query,
    })

    test('extracts token from a well-formed Bearer header', () => {
      const request = makeRequest('Bearer abc123')
      expect(Jwt.parseRequest(request)).toBe('abc123')
    })

    test('falls back to access_token query param when no Authorization header', () => {
      const request = makeRequest(undefined, { access_token: 'query-token' })
      expect(Jwt.parseRequest(request)).toBe('query-token')
    })

    test('Authorization header takes precedence over query param', () => {
      const request = makeRequest('Bearer header-token', {
        access_token: 'query-token',
      })
      expect(Jwt.parseRequest(request)).toBe('header-token')
    })

    test('non-Bearer auth scheme is ignored, falls back to query param', () => {
      const request = makeRequest('Basic dXNlcjpwYXNz', {
        access_token: 'query-token',
      })
      expect(Jwt.parseRequest(request)).toBe('query-token')
    })

    test('no header and no query param returns null', () => {
      const request = makeRequest(undefined, {})
      expect(Jwt.parseRequest(request)).toBeNull()
    })
  })
})
