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
