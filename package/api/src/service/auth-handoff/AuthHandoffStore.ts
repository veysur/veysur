import { DataSourceRedis } from '@datacapy/om'

import { randomSessionId } from 'model/common'

const TOKEN_TTL_SECONDS = 60
const KEY_PREFIX = 'authHandoff:'

// Atomically SETs the token with an expiry in one round-trip.
const MINT_SCRIPT = `
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
return 1
`

// Atomically reads and deletes the token in one round-trip, so two concurrent
// redeem calls for the same token cannot both succeed (single-use guarantee).
const REDEEM_SCRIPT = `
local value = redis.call('GET', KEYS[1])
if value then
  redis.call('DEL', KEYS[1])
end
return value
`

/**
 * AuthHandoffStore - short-lived, single-use, Redis-backed store for the
 * cross-domain auth handoff token.
 *
 * Shares the same `cacheDb` Redis datasource as RedisRateLimiter and
 * RedisTwoTierCache (see `init(redis)` below) - this is one more consumer of
 * the single existing Redis connection, not a new datasource.
 *
 * Unlike the rate limiter/cache, this store must fail loud rather than
 * fail-open: a token minted on one pod must be redeemable on another, so a
 * per-process in-memory fallback would silently break multi-pod deployments.
 */
export class AuthHandoffStore {
  private redis: DataSourceRedis | null = null

  init(redis: DataSourceRedis | null): void {
    this.redis = redis
  }

  async mint(payload: unknown): Promise<{ token: string; expiresAt: Date }> {
    if (!this.redis) {
      throw new Error('AuthHandoffStore: Redis is not available')
    }

    const token = randomSessionId()
    await this.redis.eval(
      MINT_SCRIPT,
      1,
      this.key(token),
      JSON.stringify(payload),
      String(TOKEN_TTL_SECONDS),
    )

    const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000)
    return { token, expiresAt }
  }

  async redeem<T = unknown>(token: string): Promise<T | null> {
    if (!this.redis) {
      throw new Error('AuthHandoffStore: Redis is not available')
    }

    const raw = (await this.redis.eval(
      REDEEM_SCRIPT,
      1,
      this.key(token),
    )) as string | null

    return raw ? (JSON.parse(raw) as T) : null
  }

  private key(token: string): string {
    return `${KEY_PREFIX}${token}`
  }
}

export const authHandoffStore = new AuthHandoffStore()

export default authHandoffStore
