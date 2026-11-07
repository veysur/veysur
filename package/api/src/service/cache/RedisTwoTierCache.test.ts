import { strict as assert } from 'assert'
import type { DataSourceRedis } from '@datacapy/om'
import { RedisTwoTierCache } from '../../../src/service/cache/RedisTwoTierCache'

// ─── Minimal DataSourceRedis mock ─────────────────────────────────────────────

type InvalidationMessage = { key?: string; pattern?: string }

class MockRedis {
  connected = true
  private store = new Map<string, { _id: string; data: unknown }>()
  private subscribers = new Map<string, (msg: InvalidationMessage) => void>()

  calls: { method: string; args: unknown[] }[] = []

  private record(method: string, ...args: unknown[]) {
    this.calls.push({ method, args })
  }

  async createIndex(...args: unknown[]) {
    this.record('createIndex', ...args)
  }

  async findOne(_collection: string, query: { _id: string }) {
    this.record('findOne', query)
    const doc = this.store.get(query._id)
    return doc ?? null
  }

  async insertOne(_collection: string, doc: { _id: string; data: unknown }) {
    this.record('insertOne', doc)
    this.store.set(doc._id, doc)
    return { count: 1, id: doc._id }
  }

  async deleteOne(_collection: string, query: { _id: string }) {
    this.record('deleteOne', query)
    this.store.delete(query._id)
    return { count: 1 }
  }

  async drop(_collection: string) {
    this.record('drop')
    this.store.clear()
  }

  async publish(channel: string, message: InvalidationMessage) {
    this.record('publish', channel, message)
    const cb = this.subscribers.get(channel)
    if (cb) cb(message)
  }

  async subscribe(
    channel: string,
    callback: (msg: InvalidationMessage) => void,
  ) {
    this.record('subscribe', channel)
    this.subscribers.set(channel, callback)
  }

  resetCalls() {
    this.calls = []
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeCache(redis: MockRedis) {
  return new RedisTwoTierCache<string>({
    redis: redis as unknown as DataSourceRedis,
    collectionName: 'test',
    l1TtlMs: 60_000,
    l2TtlSeconds: 600,
    keyPrefix: 'prefix:',
    invalidationChannel: 'chan',
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RedisTwoTierCache', () => {
  it('returns L1 hit without calling findOne', async () => {
    const redis = new MockRedis()
    const cache = makeCache(redis)
    await cache.init()

    await cache.set('k', 'v')
    redis.resetCalls()

    const result = await cache.get('k')
    assert.equal(result, 'v')
    assert.ok(
      redis.calls.every((c) => c.method !== 'findOne'),
      'findOne should not be called on L1 hit',
    )
  })

  it('returns L2 hit after L1 is cleared', async () => {
    const redis = new MockRedis()
    const cache = makeCache(redis)
    await cache.init()

    await cache.set('k', 'v')

    // Simulate L1 eviction by creating a fresh instance sharing the same Redis mock
    const cache2 = makeCache(redis)
    await cache2.init()
    redis.resetCalls()

    const result = await cache2.get('k')
    assert.equal(result, 'v')
    assert.ok(
      redis.calls.some((c) => c.method === 'findOne'),
      'findOne should be called on L2 hit',
    )
  })

  it('returns null after invalidate and calls deleteOne', async () => {
    const redis = new MockRedis()
    const cache = makeCache(redis)
    await cache.init()

    await cache.set('k', 'v')
    redis.resetCalls()

    await cache.invalidate('k')
    const result = await cache.get('k')

    assert.equal(result, null)
    assert.ok(
      redis.calls.some(
        (c) =>
          c.method === 'deleteOne' &&
          (c.args[0] as { _id: string })._id === 'prefix:k',
      ),
      'deleteOne should be called with correct _id',
    )
  })

  it('returns null after clear and calls drop', async () => {
    const redis = new MockRedis()
    const cache = makeCache(redis)
    await cache.init()

    await cache.set('k', 'v')
    redis.resetCalls()

    await cache.clear()
    const result = await cache.get('k')

    assert.equal(result, null)
    assert.ok(
      redis.calls.some((c) => c.method === 'drop'),
      'drop should be called on clear',
    )
  })

  it('removes specific L1 entry on pub/sub key invalidation', async () => {
    const redis = new MockRedis()
    const cache = makeCache(redis)
    await cache.init()

    await cache.set('k', 'v')
    await cache.set('other', 'x')

    // Simulate a pub/sub message from another pod
    await redis.publish('chan', { key: 'prefix:k' })

    // 'k' should be gone from L1; 'other' should remain
    redis.resetCalls()
    const gone = await cache.get('k')
    const still = await cache.get('other')

    assert.equal(still, 'x')
    // 'k' was cleared from L1 — it will go to L2 (findOne)
    assert.ok(
      redis.calls.some(
        (c) =>
          c.method === 'findOne' &&
          (c.args[0] as { _id: string })._id === 'prefix:k',
      ),
      'findOne should be called after L1 invalidation for that key',
    )
    // gone could be the L2 value or null depending on mock state; the key point
    // is L1 was cleared so findOne was attempted
    void gone
  })

  it('clears all L1 entries on pub/sub pattern invalidation', async () => {
    const redis = new MockRedis()
    const cache = makeCache(redis)
    await cache.init()

    await cache.set('a', '1')
    await cache.set('b', '2')

    await redis.publish('chan', { pattern: 'prefix:*' })

    redis.resetCalls()
    await cache.get('a')
    await cache.get('b')

    // Both should have missed L1 and attempted L2
    const findOneCalls = redis.calls.filter((c) => c.method === 'findOne')
    assert.equal(
      findOneCalls.length,
      2,
      'both keys should miss L1 after pattern clear',
    )
  })

  describe('getOrLoad', () => {
    it('loads once, then serves from L1', async () => {
      const cache = makeCache(new MockRedis())
      await cache.init()
      const load = jest.fn().mockResolvedValue('v')

      assert.equal(await cache.getOrLoad('k', load), 'v')
      assert.equal(await cache.getOrLoad('k', load), 'v')
      assert.equal(load.mock.calls.length, 1)
    })

    it('serves a second pod from L2 without loading', async () => {
      const redis = new MockRedis()
      const podA = makeCache(redis)
      const podB = makeCache(redis)
      await podA.init()
      await podB.init()
      await podA.getOrLoad('k', async () => 'v')
      const load = jest.fn().mockResolvedValue('other')

      assert.equal(await podB.getOrLoad('k', load), 'v')
      assert.equal(load.mock.calls.length, 0)
    })

    it('shares one load between concurrent misses', async () => {
      const cache = makeCache(new MockRedis())
      await cache.init()
      let resolve: (value: string) => void = () => undefined
      const load = jest.fn().mockReturnValue(
        new Promise<string>((r) => {
          resolve = r
        }),
      )

      const first = cache.getOrLoad('k', load)
      const second = cache.getOrLoad('k', load)
      for (let i = 0; i < 10; i++) await Promise.resolve()
      resolve('v')

      assert.equal(await first, 'v')
      assert.equal(await second, 'v')
      assert.equal(load.mock.calls.length, 1)
    })

    it('does not cache null results or failed loads', async () => {
      const cache = makeCache(new MockRedis())
      await cache.init()
      const load = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce('v')

      assert.equal(await cache.getOrLoad('k', load), null)
      await expect(cache.getOrLoad('k', load)).rejects.toThrow('db down')
      assert.equal(await cache.getOrLoad('k', load), 'v')
      assert.equal(load.mock.calls.length, 3)
    })

    it('works with no Redis (L1 only)', async () => {
      const cache = new RedisTwoTierCache<string>({
        redis: null,
        collectionName: 'test',
        l1TtlMs: 60_000,
        l2TtlSeconds: 600,
        invalidationChannel: 'chan',
      })
      await cache.init()
      const load = jest.fn().mockResolvedValue('v')

      await cache.getOrLoad('k', load)
      await cache.getOrLoad('k', load)
      assert.equal(load.mock.calls.length, 1)
    })
  })

  describe('maxEntries', () => {
    it('evicts the oldest L1 entry beyond the limit', async () => {
      const cache = new RedisTwoTierCache<string>({
        redis: null,
        collectionName: 'test',
        l1TtlMs: 60_000,
        l2TtlSeconds: 600,
        maxEntries: 2,
        invalidationChannel: 'chan',
      })
      await cache.set('a', '1')
      await cache.set('b', '2')
      await cache.set('c', '3')

      assert.equal(cache.getStats().l1Size, 2)
      assert.equal(await cache.get('a'), null)
      assert.equal(await cache.get('c'), '3')
    })

    it('keeps the evicted entry in L2', async () => {
      const redis = new MockRedis()
      const cache = new RedisTwoTierCache<string>({
        redis: redis as unknown as DataSourceRedis,
        collectionName: 'test',
        l1TtlMs: 60_000,
        l2TtlSeconds: 600,
        maxEntries: 1,
        invalidationChannel: 'chan',
      })
      await cache.init()
      await cache.set('a', '1')
      await cache.set('b', '2')

      assert.equal(await cache.get('a'), '1')
    })
  })
})
