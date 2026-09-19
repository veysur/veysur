import { useEffect } from 'react'

import { AuthData } from 'hook'
import { useAuth } from 'hook/useAuth'

export const AUTH_BROADCAST_CHANNEL = 'veysur-auth'

export type AuthBroadcastMessage =
  { type: 'REQUEST_AUTH' } | { type: 'AUTH_RESPONSE'; auth: AuthData }

export const AuthBroadcastProvider: React.FC = () => {
  const { auth } = useAuth()

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)

    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      if (event.data?.type === 'REQUEST_AUTH' && auth) {
        channel.postMessage({
          type: 'AUTH_RESPONSE',
          auth,
        } satisfies AuthBroadcastMessage)
      }
    }

    return () => channel.close()
  }, [auth])

  return null
}
