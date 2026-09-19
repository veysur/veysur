import { Service } from 'mzen-server'
import { DataSourceContext, DataSourceRedis } from 'mzen-om'
import { genUniqueId } from 'mzen-id'
import { Logger } from 'veysur-common'
import type { Redis } from 'ioredis'
import { parsePaginationParams, buildDateRangeQuery } from 'common'

import { RepoEventLog, EventLog } from 'model/repo/core/RepoEventLog'
import { RepoEventLogSystem } from 'model/repo/RepoEventLogSystem'

const SYSTEM_BUFFER_KEY = '__system__'
const MONGO_DUPLICATE_KEY_ERROR = 11000

interface EventEntry {
  id: string
  bufferKey: string
  projectId?: string
  action: string
  userId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  failureCount: number
}

interface BackoffState {
  failureCount: number
  nextRetryAt: number
  pendingQueue: EventEntry[]
}

interface EventLogConfig {
  memoryFlushIntervalMs: number
  memoryBatchSize: number
  redisFlushIntervalMs: number
  redisBatchSize: number
  maxMemoryBufferSizePerProject: number
  redisBackupTtlSeconds: number
  maxRetriesBeforeDlq: number
  globalMaxEvents: number
  maxBacklogQueueSize: number
  memoryWarningThreshold: number
}

export class ServiceEventLog extends Service {
  private memoryBuffer: Map<string, EventEntry[]> = new Map()
  private backoffState: Map<string, BackoffState> = new Map()
  private memoryFlushTimer: ReturnType<typeof setInterval> | null = null
  private redisFlushTimer: ReturnType<typeof setInterval> | null = null
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private isShuttingDown = false
  private eventLogConfig: EventLogConfig | null = null

  constructor() {
    super({ name: 'eventLog' })
  }

  /**
   * Lazily initialises eventLogConfig on first use rather than requiring
   * start() to have run. start() also sets up periodic flush/health timers,
   * which are appropriate for the long-running server process but must never
   * fire during a one-off task-runner invocation (run.ts's "task" mode calls
   * only modelManager.init(), never service .start() hooks - a pending
   * setInterval would keep that short-lived process from ever exiting). Every
   * read of eventLogConfig goes through this instead of the raw field, so
   * log() and friends work correctly whether or not start() ran.
   */
  private getConfig(): EventLogConfig {
    if (!this.eventLogConfig) {
      this.eventLogConfig = this.modelManager.config.app
        .eventLog as EventLogConfig
    }
    return this.eventLogConfig
  }

  async start() {
    const config = this.getConfig()
    await this.recoverFromRedis()
    this.memoryFlushTimer = setInterval(
      () =>
        this.flushAllMemoryBuffers().catch((err) =>
          this.logger.error('[EventLog] Memory flush error', err),
        ),
      config.memoryFlushIntervalMs,
    )
    this.redisFlushTimer = setInterval(
      () =>
        this.flushRedisWal().catch((err) =>
          this.logger.error('[EventLog] Redis WAL flush error', err),
        ),
      config.redisFlushIntervalMs,
    )
    this.healthCheckTimer = setInterval(() => this.emitHealthMetrics(), 60000)
  }

  async shutdown() {
    this.isShuttingDown = true
    if (this.memoryFlushTimer) clearInterval(this.memoryFlushTimer)
    if (this.redisFlushTimer) clearInterval(this.redisFlushTimer)
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer)
    this.memoryFlushTimer = null
    this.redisFlushTimer = null
    this.healthCheckTimer = null

    const flushAll = this.flushAllMemoryBuffers()
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 30000))

    await Promise.race([flushAll, timeout])

    const remaining = this.getTotalBufferedEvents()
    if (remaining > 0) {
      this.logger.warn(
        `[EventLog] Shutdown timed out with ${remaining} unflushed events — Redis WAL will cover them`,
      )
    }
  }

  async log({
    projectId,
    action,
    userId,
    metadata,
  }: {
    projectId?: string
    action: string
    userId?: string
    metadata?: Record<string, unknown>
  }) {
    if (this.isShuttingDown) {
      throw Object.assign(new Error('Event logging is shutting down'), {
        statusCode: 503,
      })
    }

    const bufferKey = projectId ?? SYSTEM_BUFFER_KEY
    const config = this.getConfig()

    const totalEvents = this.getTotalBufferedEvents()
    if (totalEvents >= config.globalMaxEvents) {
      this.dropOldestEvents()
    }

    const projectBuffer = this.memoryBuffer.get(bufferKey) ?? []
    if (projectBuffer.length >= config.maxMemoryBufferSizePerProject) {
      this.logger.warn(
        `[EventLog] Per-project buffer full for key "${bufferKey}", dropping event`,
      )
      return { id: null }
    }

    const redactedMetadata =
      metadata != null
        ? (Logger.serialize(metadata) as Record<string, unknown>)
        : undefined

    const id = genUniqueId()
    const entry: EventEntry = {
      id,
      bufferKey,
      projectId,
      action,
      userId,
      metadata: redactedMetadata,
      createdAt: new Date(),
      failureCount: 0,
    }

    projectBuffer.push(entry)
    this.memoryBuffer.set(bufferKey, projectBuffer)

    this.writeToRedisWal(entry).catch((err) =>
      this.logger.error('[EventLog] Redis WAL write error', err),
    )

    if (projectBuffer.length >= config.memoryBatchSize) {
      this.flushBuffer(bufferKey).catch((err) =>
        this.logger.error(
          `[EventLog] Immediate flush error for "${bufferKey}"`,
          err,
        ),
      )
    }

    return { id }
  }

  private async flushBuffer(bufferKey: string) {
    const entries = this.memoryBuffer.get(bufferKey) ?? []
    if (entries.length === 0) return

    this.memoryBuffer.set(bufferKey, [])

    const state = this.backoffState.get(bufferKey)
    if (state && state.nextRetryAt > Date.now()) {
      state.pendingQueue.push(...entries)
      return
    }

    try {
      await this.writeEntriesToDb(bufferKey, entries)
      await this.deleteWalKeys(entries)
      if (state) {
        this.backoffState.delete(bufferKey)
      }
    } catch (err) {
      this.logger.error(`[EventLog] DB flush failed for "${bufferKey}"`, err)
      this.handleFlushFailure(bufferKey, entries)
    }
  }

  private handleFlushFailure(bufferKey: string, entries: EventEntry[]) {
    const config = this.getConfig()
    const existing = this.backoffState.get(bufferKey) ?? {
      failureCount: 0,
      nextRetryAt: 0,
      pendingQueue: [],
    }
    const failureCount = existing.failureCount + 1
    const backoffMs = Math.min(1000 * Math.pow(2, failureCount - 1), 30000)

    const dlqCandidates = entries.filter(
      (e) => e.failureCount + 1 >= config.maxRetriesBeforeDlq,
    )
    const retryEntries = entries.filter(
      (e) => e.failureCount + 1 < config.maxRetriesBeforeDlq,
    )
    retryEntries.forEach((e) => e.failureCount++)

    if (dlqCandidates.length > 0) {
      this.moveToDlq(dlqCandidates, 'max_retries_exceeded').catch((err) =>
        this.logger.error('[EventLog] DLQ write error', err),
      )
    }

    const combined = [...existing.pendingQueue, ...retryEntries]
    const overflowCount = combined.length - config.maxBacklogQueueSize
    if (overflowCount > 0) {
      const overflow = combined.splice(0, overflowCount)
      this.logger.warn(
        `[EventLog] Backlog overflow for "${bufferKey}", moving ${overflow.length} events to DLQ`,
      )
      this.moveToDlq(overflow, 'backlog_exceeded').catch((err) =>
        this.logger.error('[EventLog] DLQ write error (backlog overflow)', err),
      )
    }

    this.backoffState.set(bufferKey, {
      failureCount,
      nextRetryAt: Date.now() + backoffMs,
      pendingQueue: combined,
    })
  }

  private async writeEntriesToDb(bufferKey: string, entries: EventEntry[]) {
    if (bufferKey === SYSTEM_BUFFER_KEY) {
      const repo = this.getRepo<RepoEventLogSystem>('eventLogSystem')
      await Promise.all(
        entries.map((e) =>
          repo
            .insertOne({
              _id: e.id,
              action: e.action,
              userId: e.userId,
              metadata: e.metadata,
              createdAt: e.createdAt,
            })
            .catch((err) => {
              if (
                (err as { code?: number })?.code !== MONGO_DUPLICATE_KEY_ERROR
              )
                throw err
            }),
        ),
      )
    } else {
      const repo = this.getRepo<RepoEventLog>('eventLog')
      const context = DataSourceContext.fromDataSources({
        project: { lookupKey: bufferKey },
      })
      await Promise.all(
        entries.map((e) =>
          repo
            .insertOne(
              {
                _id: e.id,
                action: e.action,
                userId: e.userId,
                metadata: e.metadata,
                createdAt: e.createdAt,
              },
              { context },
            )
            .catch((err) => {
              if (
                (err as { code?: number })?.code !== MONGO_DUPLICATE_KEY_ERROR
              )
                throw err
            }),
        ),
      )
    }
  }

  private async flushAllMemoryBuffers() {
    const bufferKeys = new Set([
      ...Array.from(this.memoryBuffer.keys()),
      ...Array.from(this.backoffState.keys()),
    ])

    await Promise.allSettled(
      Array.from(bufferKeys).map(async (bufferKey) => {
        const state = this.backoffState.get(bufferKey)
        if (
          state &&
          state.pendingQueue.length > 0 &&
          state.nextRetryAt <= Date.now()
        ) {
          const pending = state.pendingQueue.splice(0)
          this.memoryBuffer.set(bufferKey, [
            ...(this.memoryBuffer.get(bufferKey) ?? []),
            ...pending,
          ])
        }
        await this.flushBuffer(bufferKey)
      }),
    )
  }

  private async flushRedisWal() {
    const client = this.getRedisClient()
    if (!client) return

    const config = this.getConfig()
    const walKeys = await this.scanRedisKeys(client, 'wal:*')
    if (walKeys.length === 0) return

    const entriesByKey = new Map<string, EventEntry[]>()
    await Promise.all(
      walKeys.map(async (key) => {
        try {
          const raw = await client.get(key)
          if (!raw) return
          const entry = JSON.parse(raw) as EventEntry
          const group = entriesByKey.get(entry.bufferKey) ?? []
          group.push(entry)
          entriesByKey.set(entry.bufferKey, group)
        } catch {
          // skip malformed entries
        }
      }),
    )

    await Promise.allSettled(
      Array.from(entriesByKey.entries()).map(async ([bufferKey, entries]) => {
        const batch = entries.slice(0, config.redisBatchSize)
        try {
          await this.writeEntriesToDb(bufferKey, batch)
          await this.deleteWalKeys(batch)
        } catch (err) {
          this.logger.error(
            `[EventLog] Redis WAL flush failed for "${bufferKey}"`,
            err,
          )
          const dlqCandidates = batch.filter(
            (e) => e.failureCount + 1 >= config.maxRetriesBeforeDlq,
          )
          if (dlqCandidates.length > 0) {
            await this.moveToDlq(dlqCandidates, 'redis_wal_max_retries').catch(
              (e) =>
                this.logger.error(
                  '[EventLog] DLQ write error in Redis WAL flush',
                  e,
                ),
            )
          }
          // Update failureCount in Redis for non-DLQ entries
          const retryEntries = batch.filter(
            (e) => e.failureCount + 1 < config.maxRetriesBeforeDlq,
          )
          await Promise.allSettled(
            retryEntries.map(async (e) => {
              e.failureCount++
              await client.set(
                `wal:${e.bufferKey}:${e.id}`,
                JSON.stringify(e),
                'EX',
                config.redisBackupTtlSeconds,
              )
            }),
          )
        }
      }),
    )
  }

  private async recoverFromRedis() {
    const client = this.getRedisClient()
    if (!client) return

    const walKeys = await this.scanRedisKeys(client, 'wal:*')
    if (walKeys.length === 0) return

    let recoveredCount = 0
    let failedCount = 0

    await Promise.allSettled(
      walKeys.map(async (key) => {
        try {
          const raw = await client.getdel(key)
          if (!raw) return // another pod already claimed this entry
          const entry = JSON.parse(raw) as EventEntry
          await this.writeEntriesToDb(entry.bufferKey, [entry])
          recoveredCount++
        } catch {
          failedCount++
        }
      }),
    )

    this.logger.info(
      `[EventLog] Startup recovery complete: ${recoveredCount} recovered, ${failedCount} left in WAL`,
    )
  }

  private async writeToRedisWal(entry: EventEntry) {
    const client = this.getRedisClient()
    if (!client) return
    const config = this.getConfig()
    await client.set(
      `wal:${entry.bufferKey}:${entry.id}`,
      JSON.stringify(entry),
      'EX',
      config.redisBackupTtlSeconds,
    )
  }

  private async deleteWalKeys(entries: EventEntry[]) {
    const client = this.getRedisClient()
    if (!client || entries.length === 0) return
    await Promise.allSettled(
      entries.map((e) => client.del(`wal:${e.bufferKey}:${e.id}`)),
    )
  }

  private async moveToDlq(entries: EventEntry[], reason: string) {
    const client = this.getRedisClient()
    if (!client) return
    const now = Date.now()
    await Promise.allSettled(
      entries.map(async (e) => {
        const dlqEntry = {
          ...e,
          failureReason: reason,
          movedToDlqAt: new Date(now).toISOString(),
        }
        await client.set(`dlq:entry:${e.id}`, JSON.stringify(dlqEntry))
        await client.zadd('dlq:index', now, e.id)
        await client.del(`wal:${e.bufferKey}:${e.id}`)
      }),
    )
  }

  private async scanRedisKeys(
    client: Redis,
    pattern: string,
  ): Promise<string[]> {
    const keys: string[] = []
    let cursor = '0'
    do {
      const [nextCursor, batch] = await client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      )
      cursor = nextCursor
      keys.push(...batch)
    } while (cursor !== '0')
    return keys
  }

  private dropOldestEvents() {
    let largest = { key: '', size: 0 }
    for (const [key, buffer] of this.memoryBuffer) {
      if (buffer.length > largest.size) {
        largest = { key, size: buffer.length }
      }
    }
    if (largest.key) {
      const buffer = this.memoryBuffer.get(largest.key)!
      const dropped = buffer.splice(0, Math.ceil(buffer.length / 4))
      this.logger.warn(
        `[EventLog] Global memory pressure: dropped ${dropped.length} events from buffer "${largest.key}"`,
      )
    }
  }

  private emitHealthMetrics() {
    const config = this.getConfig()
    const totalBufferedEvents = this.getTotalBufferedEvents()
    const utilization = totalBufferedEvents / config.globalMaxEvents

    if (utilization >= config.memoryWarningThreshold) {
      this.logger.warn(
        `[EventLog] High memory pressure: ${totalBufferedEvents} events buffered (${Math.round(utilization * 100)}% of limit)`,
      )
    }

    const backoffProjects = Array.from(this.backoffState.keys())
    if (backoffProjects.length > 0) {
      this.logger.warn(
        `[EventLog] Projects in backoff: ${backoffProjects.join(', ')}`,
      )
    }
  }

  private getTotalBufferedEvents(): number {
    let total = 0
    for (const buffer of this.memoryBuffer.values()) total += buffer.length
    for (const state of this.backoffState.values())
      total += state.pendingQueue.length
    return total
  }

  private getRedisClient(): Redis | null {
    const ds = this.modelManager?.dataSources?.['cacheDb'] as
      DataSourceRedis | undefined
    if (!ds || !ds.connected) return null
    return (ds as unknown as { client: Redis }).client ?? null
  }

  async getHealth() {
    const client = this.getRedisClient()
    const totalBufferedEvents = this.getTotalBufferedEvents()
    const config = this.getConfig()

    let dlqCount = 0
    if (client) {
      try {
        dlqCount = await client.zcard('dlq:index')
      } catch {
        // non-critical
      }
    }

    const bufferSizes: Record<string, number> = {}
    for (const [key, buffer] of this.memoryBuffer) {
      bufferSizes[key] = buffer.length
    }

    return {
      bufferSizes,
      totalBufferedEvents,
      globalBufferUtilization:
        Math.round((totalBufferedEvents / config.globalMaxEvents) * 100) / 100,
      backoffProjects: Array.from(this.backoffState.keys()),
      dlqCount,
      redisConnected: client !== null,
    }
  }

  async getDlq({ page, perPage }: { page?: number; perPage?: number }) {
    const client = this.getRedisClient()
    if (!client) return { entries: [], total: 0 }

    const pageNum = page ?? 1
    const perPageNum = perPage ?? 20
    const offset = (pageNum - 1) * perPageNum

    const total = await client.zcard('dlq:index')
    const ids = await client.zrangebyscore(
      'dlq:index',
      '-inf',
      '+inf',
      'LIMIT',
      offset,
      perPageNum,
    )

    const entries = await Promise.all(
      ids.map(async (id: string) => {
        const raw = await client.get(`dlq:entry:${id}`)
        return raw ? JSON.parse(raw) : null
      }),
    )

    return { entries: entries.filter(Boolean), total }
  }

  async listProjectEvents({
    projectId,
    userId,
    action,
    startDate,
    endDate,
    page,
    perPage,
  }: {
    projectId: string
    userId?: string
    action?: string
    startDate?: string
    endDate?: string
    page?: number
    perPage?: number
  }): Promise<{ events: EventLog[]; total: number }> {
    if (!projectId) return { events: [], total: 0 }

    const pagination = parsePaginationParams(page, perPage, { perPage: 20 })
    const context = DataSourceContext.fromDataSources({
      project: { lookupKey: projectId },
    })
    const repo = this.getRepo<RepoEventLog>('eventLog')

    const query: Record<string, unknown> = {
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
      ...buildDateRangeQuery({ startDate, endDate, defaultField: 'createdAt' }),
    }

    const [events, total] = await Promise.all([
      repo.find(query, {
        sort: { createdAt: -1 },
        limit: pagination.perPage,
        skip: (pagination.page - 1) * pagination.perPage,
        context,
        skipValidation: true,
      }),
      repo.count(query, { context, skipValidation: true }),
    ])

    return { events, total }
  }

  async retryDlqEntry({ id }: { id: string }) {
    const client = this.getRedisClient()
    if (!client) throw new Error('Redis not available')

    const raw = await client.get(`dlq:entry:${id}`)
    if (!raw)
      throw Object.assign(new Error('DLQ entry not found'), { statusCode: 404 })

    const entry = JSON.parse(raw) as EventEntry & {
      failureReason?: string
      movedToDlqAt?: string
    }
    entry.failureCount = 0

    const buffer = this.memoryBuffer.get(entry.bufferKey) ?? []
    buffer.push(entry)
    this.memoryBuffer.set(entry.bufferKey, buffer)

    await client.del(`dlq:entry:${id}`)
    await client.zrem('dlq:index', id)

    return { retried: true }
  }
}

export default ServiceEventLog
