/** Server-to-client event types carried over the realtime channel. Events are hints only. */
export const REALTIME_EVENT_NOTIFICATION_CHANGED = 'notification.changed'

/** Sent to a survey's room after its patches are applied. */
export const REALTIME_EVENT_SURVEY_CHANGED = 'survey.changed'

export interface RealtimeSurveyChangedPayload {
  surveyId: string
  /** The `RealtimeClient` that made the change, so it can skip its own echo. */
  originClientId?: string
}

/** Client-to-server message that replaces the connection's JWT before it expires. */
export const REALTIME_MESSAGE_AUTH_REFRESH = 'auth:refresh'

/** Client-to-server messages that join or leave a survey's room. */
export const REALTIME_MESSAGE_SURVEY_JOIN = 'survey:join'
export const REALTIME_MESSAGE_SURVEY_LEAVE = 'survey:leave'

export interface RealtimeSurveyRoomRequest {
  projectId: string
  surveyId: string
}

/** HTTP header carrying the sender's `RealtimeClient` id on survey patch requests. */
export const REALTIME_CLIENT_ID_HEADER = 'X-Client-Id'

/** The wire envelope for every server-to-client event. */
export interface RealtimeEvent {
  type: string
  payload?: unknown
}

/** The single socket.io event name every RealtimeEvent is sent under. */
export const REALTIME_EVENT_NAME = 'event'

/** Room holding every connection of one user. */
export const realtimeUserRoom = (userId: string): string => `user:${userId}`

/** Room holding every connection with one survey open. Survey data is per project, so the id alone is not unique. */
export const realtimeSurveyRoom = (
  projectId: string,
  surveyId: string,
): string => `survey:${projectId}:${surveyId}`
