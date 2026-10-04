/** Server-to-client event types carried over the realtime channel. Events are hints only. */
export const REALTIME_EVENT_NOTIFICATION_CHANGED = 'notification.changed'

/** Client-to-server message that replaces the connection's JWT before it expires. */
export const REALTIME_MESSAGE_AUTH_REFRESH = 'auth:refresh'

/** The wire envelope for every server-to-client event. */
export interface RealtimeEvent {
  type: string
  payload?: unknown
}

/** The single socket.io event name every RealtimeEvent is sent under. */
export const REALTIME_EVENT_NAME = 'event'

/** Room holding every connection of one user. */
export const realtimeUserRoom = (userId: string): string => `user:${userId}`
