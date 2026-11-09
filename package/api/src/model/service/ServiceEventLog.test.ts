// cspell:ignore zsets zset zremrangebyscore
import { ServiceEventLog } from './ServiceEventLog'
import { asPrivate } from 'test-utils/asPrivate'

const R = '█'

interface BufferedEntry {
  action: string
  userId?: string
  metadata?: Record<string, unknown>
}

type ServicePrivateOverrides = {
  eventLogConfig: unknown
  logger: { warn: jest.Mock; error: jest.Mock; info: jest.Mock }
  memoryBuffer: Map<string, BufferedEntry[]>
  writeToRedisWal: (entry: unknown) => Promise<void>
}

function makeService() {
  const service = new ServiceEventLog()
  const withPrivates = asPrivate<ServiceEventLog, ServicePrivateOverrides>(
    service,
  )
  withPrivates.eventLogConfig = {
    memoryFlushIntervalMs: 1000,
    memoryBatchSize: 50,
    redisFlushIntervalMs: 5000,
    redisBatchSize: 200,
    maxMemoryBufferSizePerProject: 100,
    redisBackupTtlSeconds: 86400,
    dlqTtlSeconds: 604800,
    maxRetriesBeforeDlq: 5,
    globalMaxEvents: 10000,
    maxBacklogQueueSize: 500,
    memoryWarningThreshold: 0.7,
  }
  withPrivates.logger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }
  jest.spyOn(withPrivates, 'writeToRedisWal').mockResolvedValue(undefined)
  return service
}

function getBufferedEntry(service: ServiceEventLog): BufferedEntry {
  const buffer = asPrivate<ServiceEventLog, ServicePrivateOverrides>(
    service,
  ).memoryBuffer
  const entries = Array.from(buffer.values()).flat()
  return entries[entries.length - 1]
}

describe('ServiceEventLog.log() — works without start() having run', () => {
  // run.ts's task-runner mode calls modelManager.init() only, never a
  // service's start() hook (that would leave a setInterval pending and the
  // process would never exit) - log() must still work when invoked that way,
  // pulling its config lazily from modelManager.config instead of requiring
  // start() to have cached it first.
  it('lazily reads config from modelManager instead of requiring start()', async () => {
    const service = new ServiceEventLog()
    const withPrivates = asPrivate<
      ServiceEventLog,
      ServicePrivateOverrides & {
        modelManager: { config: { app: { eventLog: unknown } } }
      }
    >(service)
    withPrivates.modelManager = {
      config: {
        app: {
          eventLog: {
            memoryFlushIntervalMs: 1000,
            memoryBatchSize: 50,
            redisFlushIntervalMs: 5000,
            redisBatchSize: 200,
            maxMemoryBufferSizePerProject: 100,
            redisBackupTtlSeconds: 86400,
            dlqTtlSeconds: 604800,
            maxRetriesBeforeDlq: 5,
            globalMaxEvents: 10000,
            maxBacklogQueueSize: 500,
            memoryWarningThreshold: 0.7,
          },
        },
      },
    }
    withPrivates.logger = { warn: jest.fn(), error: jest.fn(), info: jest.fn() }
    jest.spyOn(withPrivates, 'writeToRedisWal').mockResolvedValue(undefined)

    // start() was never called - eventLogConfig is still null at this point.
    const result = await service.log({ action: 'project.created' })

    expect(result.id).toEqual(expect.any(String))
  })
})

describe('ServiceEventLog.log() — metadata redaction', () => {
  let service: ServiceEventLog

  beforeEach(() => {
    service = makeService()
  })

  it('redacts sensitive string fields in metadata before buffering', async () => {
    await service.log({
      action: 'user.email.updated',
      metadata: { email: 'alice@example.com' },
    })
    const entry = getBufferedEntry(service)
    expect(entry.metadata.email).toContain(R)
    expect(entry.metadata.email).not.toBe('alice@example.com')
  })

  it('does not redact non-sensitive metadata fields', async () => {
    await service.log({
      action: 'survey.created',
      metadata: { surveyId: 'abc123' },
    })
    const entry = getBufferedEntry(service)
    expect(entry.metadata.surveyId).toBe('abc123')
  })

  it('redacts nested sensitive fields', async () => {
    await service.log({
      action: 'test',
      metadata: { user: { token: 'tok_secret' } },
    })
    const entry = getBufferedEntry(service)
    expect((entry.metadata?.user as { token: string }).token).toContain(R)
  })

  it('handles undefined metadata without throwing', async () => {
    await expect(service.log({ action: 'user.login' })).resolves.toMatchObject({
      id: expect.any(String),
    })
    const entry = getBufferedEntry(service)
    expect(entry.metadata).toBeUndefined()
  })

  it('never redacts action or userId fields', async () => {
    await service.log({ action: 'user.password.updated', userId: 'user-1' })
    const entry = getBufferedEntry(service)
    expect(entry.action).toBe('user.password.updated')
    expect(entry.userId).toBe('user-1')
  })

  it('redacts sensitive fields within arrays in metadata', async () => {
    await service.log({
      action: 'test',
      metadata: { items: [{ password: 'secret' }] },
    })
    const entry = getBufferedEntry(service)
    expect(entry.metadata.items[0].password).toContain(R)
  })
})

describe('ServiceEventLog.listProjectEvents()', () => {
  let service: ServiceEventLog
  let mockRepoEventLog: { find: jest.Mock; count: jest.Mock }

  beforeEach(() => {
    service = new ServiceEventLog()
    mockRepoEventLog = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    }
    jest.spyOn(service, 'getRepo').mockImplementation(((name: string) => {
      const map: Record<string, unknown> = { eventLog: mockRepoEventLog }
      return map[name] ?? {}
    }) as typeof service.getRepo)
  })

  it('returns an empty result without querying when projectId is missing', async () => {
    const result = await service.listProjectEvents({ projectId: '' })

    expect(result).toEqual({ events: [], total: 0 })
    expect(mockRepoEventLog.find).not.toHaveBeenCalled()
  })

  it('routes to the given project database', async () => {
    await service.listProjectEvents({ projectId: 'proj_1' })

    const query = mockRepoEventLog.find.mock.calls[0][0]
    expect(query).toEqual({})
  })

  it('filters by userId and action when provided', async () => {
    await service.listProjectEvents({
      projectId: 'proj_1',
      userId: 'user_1',
      action: 'project.updated',
    })

    const query = mockRepoEventLog.find.mock.calls[0][0]
    expect(query).toEqual({
      userId: 'user_1',
      action: 'project.updated',
    })
  })

  it('filters by created date range when startDate/endDate are provided', async () => {
    await service.listProjectEvents({
      projectId: 'proj_1',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    })

    const query = mockRepoEventLog.find.mock.calls[0][0]
    expect(query.createdAt).toEqual({
      $gte: new Date('2026-01-01T00:00:00.000'),
      $lte: new Date('2026-01-31T23:59:59.999'),
    })
  })

  it('sorts by created date descending and paginates', async () => {
    await service.listProjectEvents({
      projectId: 'proj_1',
      page: 2,
      perPage: 10,
    })

    const options = mockRepoEventLog.find.mock.calls[0][1]
    expect(options.sort).toEqual({ createdAt: -1 })
    expect(options.limit).toBe(10)
    expect(options.skip).toBe(10)
  })

  it('returns the events and total from the repo', async () => {
    mockRepoEventLog.find.mockResolvedValue([{ _id: 'evt_1' }])
    mockRepoEventLog.count.mockResolvedValue(1)

    const result = await service.listProjectEvents({ projectId: 'proj_1' })

    expect(result).toEqual({ events: [{ _id: 'evt_1' }], total: 1 })
  })
})

class FakeRedis {
  store = new Map<string, string>()
  expiry = new Map<string, number>()
  zsets = new Map<string, Map<string, number>>()
  getdelCalls = 0

  private zset(key: string) {
    const z = this.zsets.get(key) ?? new Map<string, number>()
    this.zsets.set(key, z)
    return z
  }

  async set(key: string, value: string, _ex?: string, ttl?: number) {
    this.store.set(key, value)
    if (ttl) this.expiry.set(key, ttl)
    return 'OK'
  }
  async get(key: string) {
    return this.store.get(key) ?? null
  }
  async getdel(key: string) {
    this.getdelCalls++
    const v = this.store.get(key) ?? null
    this.store.delete(key)
    return v
  }
  async del(key: string) {
    return this.store.delete(key) ? 1 : 0
  }
  async zadd(key: string, score: number, member: string) {
    this.zset(key).set(member, score)
    return 1
  }
  async zrem(key: string, member: string) {
    return this.zset(key).delete(member) ? 1 : 0
  }
  async zcard(key: string) {
    return this.zset(key).size
  }
  async zrangebyscore(
    key: string,
    _min: string,
    _max: string,
    _limit: string,
    offset: number,
    count: number,
  ) {
    return [...this.zset(key).entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([m]) => m)
      .slice(offset, offset + count)
  }
  async zremrangebyscore(key: string, _min: string, max: number) {
    const z = this.zset(key)
    let removed = 0
    for (const [m, score] of z) {
      if (score <= max) {
        z.delete(m)
        removed++
      }
    }
    return removed
  }
  pipeline() {
    const ops: Array<() => Promise<unknown>> = []
    const chain = {
      del: (k: string) => (ops.push(() => this.del(k)), chain),
      zrem: (k: string, m: string) => (ops.push(() => this.zrem(k, m)), chain),
      exec: async () => Promise.all(ops.map((op) => op())),
    }
    return chain
  }
  scan = jest.fn()
}

type WalPrivates = ServicePrivateOverrides & {
  writeToRedisWal: (entry: unknown) => Promise<void>
  flushRedisWal: () => Promise<void>
  recoverFromRedis: () => Promise<void>
  moveToDlq: (entries: unknown[], reason: string) => Promise<void>
  getRedisClient: () => FakeRedis
  writeEntriesToDb: jest.Mock
}

function makeWalService() {
  const service = makeService()
  const p = asPrivate<ServiceEventLog, WalPrivates>(service)
  const redis = new FakeRedis()
  jest.restoreAllMocks()
  p.getRedisClient = () => redis
  p.writeEntriesToDb = jest.fn().mockResolvedValue(undefined)
  return { service, p, redis }
}

function entry(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    bufferKey: 'proj1',
    projectId: 'proj1',
    action: 'response.submitted',
    createdAt: new Date(),
    failureCount: 0,
    ...overrides,
  }
}

describe('ServiceEventLog Redis WAL index', () => {
  it('indexes each WAL entry and never scans the keyspace', async () => {
    const { p, redis } = makeWalService()

    await p.writeToRedisWal(entry('a'))

    expect(redis.store.has('wal:proj1:a')).toBe(true)
    expect(await redis.zcard('wal:index')).toBe(1)
    expect(redis.scan).not.toHaveBeenCalled()
  })

  it('flushes indexed entries to the database and clears key and index', async () => {
    const { p, redis } = makeWalService()
    await p.writeToRedisWal(entry('a'))
    await p.writeToRedisWal(entry('b'))

    await p.flushRedisWal()

    expect(p.writeEntriesToDb).toHaveBeenCalledWith(
      'proj1',
      expect.arrayContaining([
        expect.objectContaining({ id: 'a' }),
        expect.objectContaining({ id: 'b' }),
      ]),
    )
    expect(redis.store.size).toBe(0)
    expect(await redis.zcard('wal:index')).toBe(0)
    expect(redis.scan).not.toHaveBeenCalled()
  })

  it('drops index members whose key has expired', async () => {
    const { p, redis } = makeWalService()
    await redis.zadd('wal:index', Date.now(), 'proj1:gone')

    await p.flushRedisWal()

    expect(p.writeEntriesToDb).not.toHaveBeenCalled()
    expect(await redis.zcard('wal:index')).toBe(0)
  })

  it('moves a failing entry to the back of the index so it cannot starve others', async () => {
    const { p, redis } = makeWalService()
    const first = entry('a')
    await p.writeToRedisWal(first)
    const original = Date.now() - 60000
    redis.zsets.get('wal:index')!.set('proj1:a', original)
    p.writeEntriesToDb.mockRejectedValueOnce(new Error('db down'))

    await p.flushRedisWal()

    const score = redis.zsets.get('wal:index')!.get('proj1:a')!
    expect(score).toBeGreaterThan(original)
    expect(JSON.parse(redis.store.get('wal:proj1:a')!).failureCount).toBe(1)
  })

  it('reads at most redisBatchSize members per flush', async () => {
    const { p, redis } = makeWalService()
    asPrivate<ServiceEventLog, ServicePrivateOverrides>(
      p as unknown as ServiceEventLog,
    ).eventLogConfig = {
      ...(p.eventLogConfig as object),
      redisBatchSize: 2,
    }
    for (const id of ['a', 'b', 'c']) await p.writeToRedisWal(entry(id))

    await p.flushRedisWal()

    expect(await redis.zcard('wal:index')).toBe(1)
  })

  it('prunes index members older than the WAL TTL', async () => {
    const { p, redis } = makeWalService()
    await redis.zadd('wal:index', Date.now() - 86400 * 1000 - 5000, 'proj1:old')

    await p.flushRedisWal()

    expect(await redis.zcard('wal:index')).toBe(0)
  })

  it('recovers every indexed entry on startup, in more than one batch', async () => {
    const { p, redis } = makeWalService()
    ;(p.eventLogConfig as { redisBatchSize: number }).redisBatchSize = 2
    for (const id of ['a', 'b', 'c', 'd', 'e'])
      await p.writeToRedisWal(entry(id))

    await p.recoverFromRedis()

    expect(p.writeEntriesToDb).toHaveBeenCalledTimes(5)
    expect(redis.store.size).toBe(0)
    expect(await redis.zcard('wal:index')).toBe(0)
    expect(redis.scan).not.toHaveBeenCalled()
  })

  it('does nothing on startup when the index is empty', async () => {
    const { p, redis } = makeWalService()

    await p.recoverFromRedis()

    expect(redis.getdelCalls).toBe(0)
    expect(p.writeEntriesToDb).not.toHaveBeenCalled()
  })
})

describe('ServiceEventLog dead-letter queue expiry', () => {
  it('stores DLQ entries with the configured TTL and removes the WAL entry', async () => {
    const { p, redis } = makeWalService()
    await p.writeToRedisWal(entry('a'))

    await p.moveToDlq([entry('a')], 'max_retries_exceeded')

    expect(redis.expiry.get('dlq:entry:a')).toBe(604800)
    expect(await redis.zcard('dlq:index')).toBe(1)
    expect(redis.store.has('wal:proj1:a')).toBe(false)
    expect(await redis.zcard('wal:index')).toBe(0)
  })

  it('prunes DLQ index members older than the DLQ TTL', async () => {
    const { p, redis } = makeWalService()
    await redis.zadd('dlq:index', Date.now() - 604800 * 1000 - 5000, 'old')
    await redis.zadd('dlq:index', Date.now(), 'fresh')

    await p.flushRedisWal()

    expect(
      await redis.zrangebyscore('dlq:index', '-inf', '+inf', 'LIMIT', 0, 10),
    ).toEqual(['fresh'])
  })
})
