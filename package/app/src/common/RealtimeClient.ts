import { io, type Socket } from 'socket.io-client'
import {
  REALTIME_EVENT_NAME,
  REALTIME_MESSAGE_AUTH_REFRESH,
  REALTIME_MESSAGE_SURVEY_JOIN,
  REALTIME_MESSAGE_SURVEY_LEAVE,
  type RealtimeEvent,
  type RealtimeSurveyRoomRequest,
} from 'veysur-common'

type TokenProvider = () => Promise<string | undefined>

const RETRY_AFTER_REJECTION_MS = 5000

/**
 * Thin wrapper over socket.io-client for the realtime channel: websocket only,
 * a fresh JWT on every (re)connect, and a listener API that hides the socket.
 * Events are hints; consumers refetch over REST.
 */
export class RealtimeClient {
  private socket: Socket | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private readonly eventListeners = new Set<(event: RealtimeEvent) => void>()
  private readonly connectListeners = new Set<() => void>()
  private readonly surveyRooms = new Map<string, RealtimeSurveyRoomRequest>()

  /** Identifies this client in `survey.changed` payloads so it can skip its own echo. */
  readonly clientId = Math.random().toString(36).slice(2)

  constructor(
    private readonly url: string,
    private readonly path: string,
  ) {}

  connect(getToken: TokenProvider): void {
    if (this.socket) {
      return
    }
    const socket = io(this.url, {
      path: this.path,
      transports: ['websocket'],
      auth: (callback) => {
        getToken()
          .then((token) => callback({ token }))
          .catch(() => callback({}))
      },
    })
    socket.on('connect', () => {
      this.surveyRooms.forEach((room) =>
        socket.emit(REALTIME_MESSAGE_SURVEY_JOIN, room),
      )
      this.connectListeners.forEach((l) => l())
    })
    socket.on(REALTIME_EVENT_NAME, (event: RealtimeEvent) =>
      this.eventListeners.forEach((l) => l(event)),
    )
    // The library gives up on a handshake rejection (e.g. an expired token), so retry
    // with a fresh token from the provider.
    socket.on('connect_error', () => {
      if (!socket.active && !this.retryTimer) {
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null
          socket.connect()
        }, RETRY_AFTER_REJECTION_MS)
      }
    })
    this.socket = socket
  }

  disconnect(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    this.socket?.close()
    this.socket = null
  }

  /** Replaces the connection's JWT before the current one expires. */
  refreshAuth(token: string): void {
    if (this.socket?.connected) {
      this.socket.emit(REALTIME_MESSAGE_AUTH_REFRESH, { token })
    }
  }

  /**
   * Joins a survey's room, rejoining after every reconnect. Returns a function
   * that leaves it. The server refuses projects the token does not administer.
   */
  joinSurveyRoom(projectId: string, surveyId: string): () => void {
    const room = { projectId, surveyId }
    const key = `${projectId}:${surveyId}`
    this.surveyRooms.set(key, room)
    if (this.socket?.connected) {
      this.socket.emit(REALTIME_MESSAGE_SURVEY_JOIN, room)
    }
    return () => {
      this.surveyRooms.delete(key)
      if (this.socket?.connected) {
        this.socket.emit(REALTIME_MESSAGE_SURVEY_LEAVE, room)
      }
    }
  }

  onEvent(listener: (event: RealtimeEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /** Fires on every successful (re)connect, so consumers can resync missed events. */
  onConnect(listener: () => void): () => void {
    this.connectListeners.add(listener)
    return () => this.connectListeners.delete(listener)
  }
}
