import type { Server as SocketServer, Socket } from 'socket.io'
import {
  REALTIME_MESSAGE_AUTH_REFRESH,
  REALTIME_MESSAGE_SURVEY_JOIN,
  REALTIME_MESSAGE_SURVEY_LEAVE,
  realtimeSurveyRoom,
  realtimeUserRoom,
  type RealtimeSurveyRoomRequest,
} from 'veysur-common'

import { RealtimeAuthenticator } from './RealtimeAuthenticator'

export type RealtimeMessageHandler = (
  socket: Socket,
  data: unknown,
) => Promise<void> | void

type Ack = (result: { ok: boolean }) => void

/**
 * Owns the per-connection lifecycle on a socket.io server: authenticates the
 * handshake, joins the user room, expires the connection with its token, and
 * dispatches client messages through a registry keyed by message type.
 */
export class RealtimeGateway {
  private readonly handlers = new Map<string, RealtimeMessageHandler>()
  private readonly expiryTimers = new Map<string, NodeJS.Timeout>()

  constructor(
    private readonly io: SocketServer,
    private readonly authenticator: RealtimeAuthenticator,
  ) {}

  registerHandler(type: string, handler: RealtimeMessageHandler): void {
    this.handlers.set(type, handler)
  }

  start(): void {
    this.io.use(async (socket, next) => {
      const identity = await this.authenticator.authenticate(
        socket.handshake.auth?.token,
      )
      if (!identity) {
        next(new Error('unauthorised'))
        return
      }
      socket.data.userId = identity.userId
      socket.data.projectIds = identity.projectIds
      this.scheduleExpiry(socket, identity.expiresAtMs)
      next()
    })
    this.io.on('connection', (socket) => this.onConnection(socket))
  }

  stop(): void {
    for (const timer of this.expiryTimers.values()) {
      clearTimeout(timer)
    }
    this.expiryTimers.clear()
  }

  private onConnection(socket: Socket): void {
    socket.join(realtimeUserRoom(socket.data.userId))
    socket.on('disconnect', () => this.clearExpiry(socket))
    socket.on(REALTIME_MESSAGE_AUTH_REFRESH, (data: unknown, ack?: Ack) => {
      this.refreshAuth(socket, data)
        .then((ok) => ack?.({ ok }))
        .catch(() => ack?.({ ok: false }))
    })
    socket.on(REALTIME_MESSAGE_SURVEY_JOIN, (data: unknown, ack?: Ack) => {
      const ok = this.joinSurveyRoom(socket, data)
      ack?.({ ok })
    })
    socket.on(REALTIME_MESSAGE_SURVEY_LEAVE, (data: unknown, ack?: Ack) => {
      const request = this.parseSurveyRoomRequest(data)
      if (request) {
        socket.leave(realtimeSurveyRoom(request.projectId, request.surveyId))
      }
      ack?.({ ok: !!request })
    })
    for (const [type, handler] of this.handlers) {
      socket.on(type, (data: unknown) => {
        Promise.resolve(handler(socket, data)).catch(() => undefined)
      })
    }
  }

  private joinSurveyRoom(socket: Socket, data: unknown): boolean {
    const request = this.parseSurveyRoomRequest(data)
    const projectIds: string[] = socket.data.projectIds ?? []
    if (!request || !projectIds.includes(request.projectId)) {
      return false
    }
    socket.join(realtimeSurveyRoom(request.projectId, request.surveyId))
    return true
  }

  private parseSurveyRoomRequest(
    data: unknown,
  ): RealtimeSurveyRoomRequest | null {
    const { projectId, surveyId } = (data ?? {}) as Partial<
      Record<keyof RealtimeSurveyRoomRequest, unknown>
    >
    return typeof projectId === 'string' && typeof surveyId === 'string'
      ? { projectId, surveyId }
      : null
  }

  private async refreshAuth(socket: Socket, data: unknown): Promise<boolean> {
    const token = (data as { token?: unknown } | null)?.token
    const identity = await this.authenticator.authenticate(token)
    if (!identity || identity.userId !== socket.data.userId) {
      return false
    }
    socket.data.projectIds = identity.projectIds
    this.scheduleExpiry(socket, identity.expiresAtMs)
    return true
  }

  private scheduleExpiry(socket: Socket, expiresAtMs: number): void {
    this.clearExpiry(socket)
    const delay = Math.max(0, expiresAtMs - Date.now())
    const timer = setTimeout(() => socket.disconnect(true), delay)
    timer.unref()
    this.expiryTimers.set(socket.id, timer)
  }

  private clearExpiry(socket: Socket): void {
    const timer = this.expiryTimers.get(socket.id)
    if (timer) {
      clearTimeout(timer)
      this.expiryTimers.delete(socket.id)
    }
  }
}
