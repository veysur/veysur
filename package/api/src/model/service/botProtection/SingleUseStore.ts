import type { Redis } from 'ioredis'

/** Remembers a value for a while so it can be accepted only once. */
export interface SingleUseStore {
  /** True the first time `key` is claimed within `ttlSeconds`, false after. */
  claim(key: string, ttlSeconds: number): Promise<boolean>
}

export class RedisSingleUseStore implements SingleUseStore {
  constructor(private readonly redis: Redis) {}

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(
      `bot-protection:${key}`,
      '1',
      'EX',
      ttlSeconds,
      'NX',
    )
    return result === 'OK'
  }
}

/** Single-process fallback for deployments without Redis (local dev, tests). */
export class MemorySingleUseStore implements SingleUseStore {
  private readonly expiresAt = new Map<string, number>()

  async claim(key: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now()
    for (const [stored, expiry] of this.expiresAt) {
      if (expiry <= now) this.expiresAt.delete(stored)
    }
    if (this.expiresAt.has(key)) return false
    this.expiresAt.set(key, now + ttlSeconds * 1000)
    return true
  }
}
