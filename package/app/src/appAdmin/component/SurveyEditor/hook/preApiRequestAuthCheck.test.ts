import { preApiRequestAuthCheck } from './preApiRequestAuthCheck'
import { AuthData } from 'hook'

const buildAuth = (overrides: {
  accessTokenExpiresAt?: Date
  jwtExpires?: Date
}): AuthData =>
  ({
    accessToken: overrides.accessTokenExpiresAt
      ? {
          token: 'access-token',
          ip: '127.0.0.1',
          ttl: 3600,
          createdAt: new Date(),
          expiresAt: overrides.accessTokenExpiresAt,
        }
      : undefined,
    jwt: overrides.jwtExpires
      ? {
          token: 'jwt-token',
          created: new Date(),
          expires: overrides.jwtExpires,
        }
      : undefined,
  }) as AuthData

describe('preApiRequestAuthCheck', () => {
  it('rejects when there is no auth', () => {
    expect(preApiRequestAuthCheck(undefined)).rejects.toBe('Invalid JWT')
  })

  it('rejects when the access token has expired', () => {
    const auth = buildAuth({
      accessTokenExpiresAt: new Date(Date.now() - 60_000),
      jwtExpires: new Date(Date.now() + 60_000),
    })
    expect(preApiRequestAuthCheck(auth)).rejects.toBe('Invalid JWT')
  })

  it('does not reject when the JWT has expired but the access token is still valid', () => {
    const auth = buildAuth({
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      jwtExpires: new Date(Date.now() - 60_000),
    })
    expect(preApiRequestAuthCheck(auth)).toBeUndefined()
  })

  it('does not reject when both the access token and JWT are valid', () => {
    const auth = buildAuth({
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      jwtExpires: new Date(Date.now() + 60_000),
    })
    expect(preApiRequestAuthCheck(auth)).toBeUndefined()
  })
})
