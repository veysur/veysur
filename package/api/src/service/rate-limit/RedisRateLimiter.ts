import { DataSourceRedis } from '@datacapy/om'

export interface RateLimiterOptions {
  limit: number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number
}

interface FallbackEntry {
  count: number
  expiresAt: number
}

const FALLBACK_SWEEP_INTERVAL_MS = 60_000 // minimum time between sweeps

// Atomically increments the counter for the window key and sets TTL on
// first write. Returns [count, remaining_ttl_seconds].
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
`

/**
 * RedisRateLimiter - Fixed-window rate limiter backed by Redis
 *
 * Uses an atomic Lua script to increment and TTL-set in one round-trip.
 * Falls back to a per-process in-memory counter when Redis is unavailable
 * (soft protection only — not shared across pods in fallback mode).
 *
 * Call `init(redis)` at stage 01-model-initialised to wire up the Redis
 * datasource, mirroring the pattern used by RedisTwoTierCache.
 */
export class RedisRateLimiter {
  private redis: DataSourceRedis | null = null
  private fallback = new Map<string, FallbackEntry>()
  private lastFallbackSweepAt: number = 0
  private readonly options: RateLimiterOptions

  constructor(options: RateLimiterOptions) {
    this.options = options
  }

  init(redis: DataSourceRedis | null): void {
    this.redis = redis
  }

  async check(key: string): Promise<RateLimitResult> {
    if (this.redis) {
      return this.checkRedis(this.redis, key)
    }
    return this.checkFallback(key)
  }

  private async checkRedis(
    redis: DataSourceRedis,
    key: string,
  ): Promise<RateLimitResult> {
    const { limit, windowSeconds } = this.options
    try {
      const [count, ttl] = (await redis.eval(
        RATE_LIMIT_SCRIPT,
        1,
        key,
        String(windowSeconds),
      )) as [number, number]
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfter: ttl > 0 ? ttl : windowSeconds,
      }
    } catch {
      // Redis error — fail open so a Redis outage does not take down the API
      return { allowed: true, remaining: limit, retryAfter: 0 }
    }
  }

  private checkFallback(key: string): RateLimitResult {
    const { limit, windowSeconds } = this.options
    const now = Date.now()

    // Sweep all expired entries if the cooldown has elapsed.
    // Triggered by an incoming request rather than a background timer.
    // lastFallbackSweepAt is updated immediately so concurrent requests in the
    // same tick do not each schedule their own sweep.
    if (now - this.lastFallbackSweepAt >= FALLBACK_SWEEP_INTERVAL_MS) {
      this.lastFallbackSweepAt = now
      setImmediate(() => {
        const sweepNow = Date.now()
        for (const [k, entry] of this.fallback) {
          if (entry.expiresAt <= sweepNow) {
            this.fallback.delete(k)
          }
        }
      })
    }

    const entry = this.fallback.get(key) ?? null

    if (!entry || entry.expiresAt <= now) {
      this.fallback.set(key, {
        count: 1,
        expiresAt: now + windowSeconds * 1000,
      })
      return { allowed: true, remaining: limit - 1, retryAfter: 0 }
    }

    entry.count++
    const retryAfter = Math.ceil((entry.expiresAt - now) / 1000)
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      retryAfter,
    }
  }
}
