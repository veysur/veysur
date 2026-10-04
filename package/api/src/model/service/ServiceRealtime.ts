import { Service } from '@datacapy/server'
import { DataSourceRedis } from '@datacapy/om'
import { Emitter } from '@socket.io/redis-emitter'
import type { Server as SocketServer } from 'socket.io'
import {
  REALTIME_EVENT_NAME,
  realtimeUserRoom,
  type RealtimeEvent,
} from 'veysur-common'

/**
 * Pushes realtime hints to connected clients. With Redis the event goes through
 * the socket.io Redis emitter, which works the same in the API pod and in the
 * task-manager worker (neither needs an `io` instance). Without Redis (local
 * dev, unit tests) it falls back to the in-process `io`, or does nothing.
 * Failures are logged, never thrown: a socket problem must not fail a job.
 */
export class ServiceRealtime extends Service {
  private emitter: Emitter | null = null
  private io: SocketServer | null = null

  constructor() {
    super({ name: 'realtime' })
  }

  attachIo(io: SocketServer | null): void {
    this.io = io
  }

  async emitToUser(
    userId: string,
    type: string,
    payload?: unknown,
  ): Promise<void> {
    try {
      const event: RealtimeEvent = { type, payload }
      const room = realtimeUserRoom(userId)
      const emitter = this.getEmitter()
      if (emitter) {
        emitter.to(room).emit(REALTIME_EVENT_NAME, event)
      } else if (this.io) {
        this.io.to(room).emit(REALTIME_EVENT_NAME, event)
      }
    } catch (error) {
      this.modelManager.logger.error('Realtime emit failed', error)
    }
  }

  private getEmitter(): Emitter | null {
    if (this.emitter) {
      return this.emitter
    }
    const redis = this.modelManager.dataSources['cacheDb'] as
      DataSourceRedis | undefined
    if (!redis) {
      return null
    }
    // The emitter's publisher must not carry the datasource keyPrefix
    this.emitter = new Emitter(redis.duplicate({ keyPrefix: undefined }))
    return this.emitter
  }
}

export default ServiceRealtime
