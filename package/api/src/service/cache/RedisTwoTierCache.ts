import { DataSourceRedis } from '@datacapy/om'
import type { LoggerLike } from 'veysur-common'

export interface RedisTwoTierCacheOptions {
  redis: DataSourceRedis | null
  collectionName: string // Redis collection name for L2 document storage
  l1TtlMs: number // L1 cache TTL in milliseconds
  l2TtlSeconds: number // L2 (Redis) cache TTL in seconds
  keyPrefix?: string // Prefix for L1 Map keys (defaults to empty — collectionName already namespaces)
  invalidationChannel: string // Pub/sub channel for cluster-wide invalidation
  logger?: LoggerLike
}

interface CacheEntry<T> {
  value: T
  timestamp: number
}

/**
 * RedisTwoTierCache - Redis-based L1+L2 cache implementation
 *
 * Architecture:
 * - L1 Cache: In-memory Map with short TTL (2 minutes) - ultra-fast, per-pod
 * - L2 Cache: Redis with longer TTL (10 minutes) - shared across all pods
 *
 * Features:
 * - Ultra-fast L1 hits (no network roundtrip)
 * - Cluster-wide sharing via L2 (Redis)
 * - Graceful degradation (falls back to L1-only if Redis unavailable)
 * - Automatic cache invalidation via Redis pub/sub
 * - Cache statistics
 *
 * Call `await init()` after construction to register TTL and subscribe to
 * cross-pod invalidation messages.
 */
export class RedisTwoTierCache<T = unknown> {
  private l1Cache = new Map<string, CacheEntry<T>>()
  private redis: DataSourceRedis | null
  private options: RedisTwoTierCacheOptions
  private logger: LoggerLike
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0,
  }

  constructor(options: RedisTwoTierCacheOptions) {
    this.redis = options.redis
    this.options = options
    this.logger = options.logger || console
  }

  /**
   * Register TTL on the Redis collection and subscribe to cluster-wide
   * invalidation messages. Must be awaited after construction.
   */
  async init(): Promise<void> {
    if (this.redis) {
      await this.redis.createIndex(
        this.options.collectionName,
        { _id: 1 },
        { expireAfterSeconds: this.options.l2TtlSeconds },
      )
      await this.subscribeToInvalidations()
    }
  }

  /**
   * Subscribe to cluster-wide cache invalidation messages
   */
  private async subscribeToInvalidations(): Promise<void> {
    if (!this.redis) return

    try {
      await this.redis.subscribe(
        this.options.invalidationChannel,
        (message: { key?: string; pattern?: string }) => {
          if (message.key) {
            // Invalidate specific key from L1
            this.l1Cache.delete(message.key)
          } else if (message.pattern) {
            // Invalidate all keys matching pattern from L1
            const keysToDelete: string[] = []
            for (const key of this.l1Cache.keys()) {
              if (this.matchesPattern(key, message.pattern)) {
                keysToDelete.push(key)
              }
            }
            keysToDelete.forEach((key) => this.l1Cache.delete(key))
          }
        },
      )
    } catch (error) {
      this.logger.error('Error subscribing to invalidations:', error)
    }
  }

  /**
   * Simple pattern matching for cache key patterns
   */
  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
    )
    return regex.test(key)
  }

  /**
   * Get value from cache (tries L1, then L2, then returns null)
   */
  async get(key: string): Promise<T | null> {
    const fullKey = `${this.options.keyPrefix ?? ''}${key}`

    // Try L1 cache first
    const l1Entry = this.l1Cache.get(fullKey)
    if (l1Entry) {
      const age = Date.now() - l1Entry.timestamp
      if (age < this.options.l1TtlMs) {
        this.stats.l1Hits++
        return l1Entry.value
      } else {
        // Expired, remove from L1
        this.l1Cache.delete(fullKey)
      }
    }

    // Try L2 cache (Redis) if available
    if (this.redis && this.redis.connected) {
      try {
        const doc = await this.redis.findOne(this.options.collectionName, {
          _id: fullKey,
        })
        if (doc !== null) {
          this.stats.l2Hits++

          // Populate L1 cache with L2 value
          this.l1Cache.set(fullKey, {
            value: doc.data as T,
            timestamp: Date.now(),
          })

          return doc.data as T
        }
      } catch (error) {
        this.logger.error(`L2 cache error for key ${fullKey}:`, error)
        // Continue to return null (cache miss)
      }
    }

    // Cache miss
    this.stats.misses++
    return null
  }

  /**
   * Set value in both L1 and L2 caches
   */
  async set(key: string, value: T): Promise<void> {
    const fullKey = `${this.options.keyPrefix ?? ''}${key}`

    // Set in L1 cache
    this.l1Cache.set(fullKey, {
      value,
      timestamp: Date.now(),
    })

    // Set in L2 cache (Redis) if available
    if (this.redis && this.redis.connected) {
      try {
        // insertOne with an existing _id overwrites (Redis SET) — safe as upsert
        await this.redis.insertOne(this.options.collectionName, {
          _id: fullKey,
          data: value,
        })
      } catch (error) {
        this.logger.error(`Error setting L2 cache for key ${fullKey}:`, error)
        // Continue anyway - L1 cache is set
      }
    }
  }

  /**
   * Invalidate a specific key from both L1 and L2 caches
   * Also publishes invalidation message for cluster-wide L1 invalidation
   */
  async invalidate(key: string): Promise<void> {
    const fullKey = `${this.options.keyPrefix ?? ''}${key}`

    // Remove from L1
    this.l1Cache.delete(fullKey)

    // Remove from L2 and publish invalidation message
    if (this.redis && this.redis.connected) {
      try {
        await this.redis.deleteOne(this.options.collectionName, {
          _id: fullKey,
        })
        await this.redis.publish(this.options.invalidationChannel, {
          key: fullKey,
        })
      } catch (error) {
        this.logger.error(`Error invalidating cache for key ${fullKey}:`, error)
      }
    }
  }

  /**
   * Invalidate all keys matching a pattern from L1.
   * Also publishes invalidation message for cluster-wide L1 invalidation.
   *
   * Note: L2 pattern deletion is not supported by DataSourceRedis with
   * trackIds:false. Since each cache instance owns a dedicated collection,
   * this drops the entire collection — equivalent to clearing all keys.
   * Only call this when clearing all entries is acceptable.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = `${this.options.keyPrefix ?? ''}${pattern}`

    // Remove matching keys from L1
    const l1KeysToDelete: string[] = []
    for (const key of this.l1Cache.keys()) {
      if (this.matchesPattern(key, fullPattern)) {
        l1KeysToDelete.push(key)
      }
    }
    l1KeysToDelete.forEach((key) => this.l1Cache.delete(key))

    // Remove from L2 and publish invalidation message
    if (this.redis && this.redis.connected) {
      try {
        // DataSourceRedis with trackIds:false cannot delete by key pattern —
        // full-collection scans are unsupported. Since each cache instance owns
        // a dedicated collection, dropping the entire collection is equivalent
        // to pattern-deleting all keys.
        await this.redis.drop(this.options.collectionName)
        await this.redis.publish(this.options.invalidationChannel, {
          pattern: fullPattern,
        })
      } catch (error) {
        this.logger.error(
          `Error invalidating cache pattern ${fullPattern}:`,
          error,
        )
      }
    }

    return l1KeysToDelete.length
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear L1
    this.l1Cache.clear()

    // Clear L2 and notify other pods
    if (this.redis && this.redis.connected) {
      try {
        await this.redis.drop(this.options.collectionName)
        await this.redis.publish(this.options.invalidationChannel, {
          pattern: `${this.options.keyPrefix ?? ''}*`,
        })
      } catch (error) {
        this.logger.error('Error clearing cache:', error)
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      l1Size: this.l1Cache.size,
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      misses: this.stats.misses,
      hitRate:
        this.stats.l1Hits + this.stats.l2Hits > 0
          ? (
              ((this.stats.l1Hits + this.stats.l2Hits) /
                (this.stats.l1Hits + this.stats.l2Hits + this.stats.misses)) *
              100
            ).toFixed(2) + '%'
          : '0%',
    }
  }
}
