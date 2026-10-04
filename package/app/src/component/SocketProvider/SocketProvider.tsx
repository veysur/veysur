import { useEffect } from 'react'

import { useAuth } from 'hook/useAuth'
import {
  useRealtimeInvalidation,
  type RealtimeInvalidationMap,
} from 'hook/useRealtimeInvalidation'
import { getSocketClient } from 'registry'

// Refresh the JWT just before it expires so the server keeps the connection open.
// useAuth refreshes once the token is within 2s of expiry.
const REFRESH_BEFORE_EXPIRY_MS = 1500

/**
 * Keeps the realtime socket connected while authenticated and turns server
 * events into query invalidations. Renders nothing.
 */
export const SocketProvider: React.FC<{
  invalidationMap: RealtimeInvalidationMap
}> = ({ invalidationMap }) => {
  const { isAuthed, auth, authRefreshWithRetry } = useAuth()
  const jwtToken = auth?.jwt?.token
  const jwtExpires = auth?.jwt?.expires

  useRealtimeInvalidation(invalidationMap)

  useEffect(() => {
    if (!isAuthed) {
      return
    }
    const client = getSocketClient()
    client.connect(async () => (await authRefreshWithRetry())?.jwt.token)
    return () => client.disconnect()
    // authRefreshWithRetry is recreated every render; only connect on auth changes
  }, [isAuthed]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (jwtToken) {
      getSocketClient().refreshAuth(jwtToken)
    }
  }, [jwtToken])

  useEffect(() => {
    if (!jwtExpires) {
      return
    }
    const delay = Math.max(
      0,
      new Date(jwtExpires).getTime() - Date.now() - REFRESH_BEFORE_EXPIRY_MS,
    )
    const timer = setTimeout(() => {
      authRefreshWithRetry().catch(() => undefined)
    }, delay)
    return () => clearTimeout(timer)
  }, [jwtExpires]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
