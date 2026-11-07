import { DataSourceRedis } from '@datacapy/om'
import { Service } from '@datacapy/server'

import { createRedisTwoTierCache } from 'service/cache/createRedisTwoTierCache'
import type { RedisTwoTierCache } from 'service/cache/RedisTwoTierCache'

// How long a pod may serve what another pod's publish, settings write or plan
// change has made stale, when the invalidation message is missed or the change
// has no hook (a plan change flipping noBrand).
const TTL_MS = 5_000
const TTL_SECONDS = 5

type CacheName = 'live' | 'view' | 'botProtection'

/**
 * Short-lived cache of what every participant of a published survey reads
 * identically: the live publication with its partial snapshot, the assembled
 * survey view, and the project's bot-protection setting. Writers call
 * `invalidateSurvey` / `invalidateProject`; Redis pub/sub carries that to
 * the other pods. L2 returns plain JSON, so cached values must be
 * serialisable.
 */
export class ServiceSurveyParticipantCache extends Service {
  private readonly caches = new Map<
    CacheName,
    Promise<RedisTwoTierCache<unknown>>
  >()

  constructor() {
    super({ name: 'surveyParticipantCache' })
  }

  getLive<T>(
    projectId: string,
    surveyId: string,
    load: () => Promise<T | null | undefined>,
  ) {
    return this.getOrLoad('live', `${projectId}:${surveyId}`, load)
  }

  getView<T>(
    projectId: string,
    snapshotId: string,
    lang: string | null,
    load: () => Promise<T | null | undefined>,
  ) {
    return this.getOrLoad(
      'view',
      `${projectId}:${snapshotId}:${lang ?? ''}`,
      load,
    )
  }

  getBotProtection<T>(
    projectId: string,
    load: () => Promise<T | null | undefined>,
  ) {
    return this.getOrLoad('botProtection', projectId, load)
  }

  async invalidateSurvey(projectId: string, surveyId: string) {
    await (await this.cache('live')).invalidate(`${projectId}:${surveyId}`)
  }

  /** Project settings changed: the views and bot-protection setting built from them are stale. */
  async invalidateProject(projectId: string) {
    const pattern = `${projectId}:*`
    await (await this.cache('view')).invalidatePattern(pattern)
    await (await this.cache('botProtection')).invalidate(projectId)
  }

  private async getOrLoad<T>(
    name: CacheName,
    key: string,
    load: () => Promise<T | null | undefined>,
  ): Promise<T | null | undefined> {
    const cache = await this.cache(name)
    return (await cache.getOrLoad(key, load)) as T | null | undefined
  }

  private cache(name: CacheName) {
    let cache = this.caches.get(name)
    if (!cache) {
      const redis =
        (this.modelManager?.dataSources?.['cacheDb'] as DataSourceRedis) ?? null
      cache = createRedisTwoTierCache<unknown>(
        {
          collectionName: `surveyParticipantCache:${name}`,
          l1TtlMs: TTL_MS,
          l2TtlSeconds: TTL_SECONDS,
          maxEntries: 500,
          invalidationChannel: `surveyParticipantCache:${name}:invalidate`,
        },
        redis,
        this.logger,
      )
      this.caches.set(name, cache)
    }
    return cache
  }
}

export default ServiceSurveyParticipantCache
