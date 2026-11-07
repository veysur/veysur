import { DataSourceRedis } from '@datacapy/om'
import type { LoggerLike } from 'veysur-common'

import {
  RedisTwoTierCache,
  type RedisTwoTierCacheOptions,
} from './RedisTwoTierCache'

/**
 * Build and initialise a cache, falling back to a per-pod L1 cache when Redis is
 * missing or its setup fails, so a cache problem never fails a request.
 */
export async function createRedisTwoTierCache<T>(
  options: Omit<RedisTwoTierCacheOptions, 'redis' | 'logger'>,
  redis: DataSourceRedis | null,
  logger: LoggerLike,
): Promise<RedisTwoTierCache<T>> {
  try {
    const cache = new RedisTwoTierCache<T>({ ...options, redis, logger })
    await cache.init()
    return cache
  } catch (error) {
    logger.error(
      `Cache ${options.collectionName}: L2 unavailable, using L1 only`,
      error,
    )
    return new RedisTwoTierCache<T>({ ...options, redis: null, logger })
  }
}
