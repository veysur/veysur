import momentTimezone from 'moment-timezone'
import { useCallback, useEffect, useState } from 'react'
import { useIsRestoring } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import {
  AUTH_BROADCAST_CHANNEL,
  AuthBroadcastMessage,
} from 'component/AuthBroadcastProvider'
import { AuthDomain, RedirectPending } from 'model'
import { queryClient } from 'common/queryClient'
import { KEY_STATE_AUTH } from 'common/keyState'

import { useAuth, AuthData } from './useAuth'

export type UseAuthLoginRedirectOptions = {
  // If true, the broadcast-listener timeout falls back to AuthDomain.handleAuth() when no
  // tab responds. If false, the timeout simply closes the channel.
  broadcastTimeoutFallback?: boolean
  // If true, check RedirectPending.remove('authGate') and navigate there before falling
  // back to AuthDomain.handleAuthed().
  checkRedirectPending?: boolean
  // If true, only call AuthDomain.handleAuthed(navigate, auth) when there is no returnTo
  // (the same-origin broadcast relay handles routing when returnTo is present).
  requireNoReturnToForHandleAuthed?: boolean
  // If true, skip the immediate AuthDomain.handleAuth() call when unauthenticated and a
  // returnTo + BroadcastChannel are present (the broadcast relay handles it instead).
  deferHandleAuthForBroadcastRelay?: boolean
}

export function useAuthLoginRedirect(
  options: UseAuthLoginRedirectOptions = {},
) {
  const {
    broadcastTimeoutFallback = false,
    checkRedirectPending = false,
    requireNoReturnToForHandleAuthed = false,
    deferHandleAuthForBroadcastRelay = false,
  } = options

  const { auth, isAuthed, authRefresh } = useAuth()
  const isRestoring = useIsRestoring()
  const navigate = useNavigate()
  const [broadcastAuth, setBroadcastAuth] = useState<AuthData | null>(null)
  const [sameOriginRedirect, setSameOriginRedirect] = useState<string | null>(
    null,
  )

  const urlParams = new URLSearchParams(window.location.search)
  const returnTo = urlParams.get('returnTo')

  const isReturnToSameOrigin = useCallback((url: string): boolean => {
    try {
      return new URL(url).origin === window.location.origin
    } catch {
      return true
    }
  }, [])

  // Listen for an AUTH_RESPONSE from an existing tab with a live session via
  // BroadcastChannel. BroadcastChannel is same-origin only, so this is no less secure
  // than sessionStorage itself.
  useEffect(() => {
    if (isAuthed || !returnTo || !('BroadcastChannel' in window)) return
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
    const timeout = setTimeout(() => {
      channel.close()
      if (broadcastTimeoutFallback) {
        // No existing tab responded — fall back to auth domain redirect
        AuthDomain.handleAuth()
      }
    }, 500)
    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      if (event.data?.type === 'AUTH_RESPONSE' && event.data.auth) {
        setBroadcastAuth(event.data.auth)
        clearTimeout(timeout)
        channel.close()
      }
    }
    channel.postMessage({ type: 'REQUEST_AUTH' } satisfies AuthBroadcastMessage)
    return () => {
      clearTimeout(timeout)
      channel.close()
    }
  }, [isAuthed, returnTo, broadcastTimeoutFallback])

  // Auto-proceed when broadcast auth is received and returnTo is on the same origin.
  // Sets auth in the query cache and triggers a declarative <Navigate> so that the route
  // change and the auth state land in the same render batch.
  useEffect(() => {
    if (!broadcastAuth || !returnTo) return
    if (!isReturnToSameOrigin(returnTo)) return
    let targetPath = returnTo
    try {
      const url = new URL(returnTo)
      targetPath = url.pathname + (url.search ?? '')
    } catch {
      // returnTo is already a relative path
    }
    queryClient.setQueryData([KEY_STATE_AUTH], broadcastAuth)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to an async BroadcastChannel message from another tab, paired with an imperative queryClient write that can't happen during render
    setSameOriginRedirect(targetPath)
  }, [broadcastAuth, returnTo, isReturnToSameOrigin])

  /**
   * Ensures JWT is fresh before transferring auth to another domain.
   * If JWT is expired or near-expiry (within 30 seconds), refreshes it first.
   */
  const ensureFreshJwtAndHandleAuthed = useCallback(
    async (currentAuth: AuthData | undefined) => {
      if (!currentAuth) {
        AuthDomain.handleAuthed(navigate, currentAuth)
        return
      }

      let authToUse: AuthData = currentAuth

      // Check if JWT is expired or near-expiry (within 30 seconds buffer)
      if (
        currentAuth?.jwt &&
        momentTimezone(currentAuth.jwt.expires).isBefore(
          momentTimezone().add(30, 'seconds'),
        )
      ) {
        try {
          const refreshedAuth = await authRefresh()
          if (refreshedAuth) {
            authToUse = refreshedAuth
          }
        } catch (error) {
          // If refresh fails (e.g., access token expired), the authRefresh
          // function will handle logout - we don't need to proceed
          console.error('JWT refresh failed before domain transfer:', error)
          return
        }
      }

      AuthDomain.handleAuthed(navigate, authToUse)
    },
    [authRefresh, navigate],
  )

  useEffect(() => {
    // Defer until the persisted session cache has finished restoring — otherwise an
    // already-authenticated user landing directly on /login (e.g. via RedirectPending) would be
    // sent through AuthDomain.handleAuth() before their real session had a chance to load.
    if (isRestoring) return
    if (!isAuthed) {
      if (
        !deferHandleAuthForBroadcastRelay ||
        !returnTo ||
        !('BroadcastChannel' in window)
      ) {
        // Redirect to auth domain immediately. When deferHandleAuthForBroadcastRelay is
        // set and a returnTo + BroadcastChannel are present, the broadcast effect handles
        // the relay and calls handleAuth() only if no existing tab responds.
        AuthDomain.handleAuth()
      }
    } else {
      // Check if we're on auth domain with a returnTo parameter
      const urlParams = new URLSearchParams(window.location.search)
      const returnTo = urlParams.get('returnTo')

      if (AuthDomain.onAuthDomain() && returnTo) {
        // Check whether the login form's submit handler just ran (New Login flow)
        if (AuthDomain.consumeLoginJustSubmitted()) {
          // New Login flow: proceed immediately.
          // Ensure JWT is fresh before transferring to target domain
          ensureFreshJwtAndHandleAuthed(auth)
        } else {
          // Already Authenticated flow: show button and wait for user to click
          // Note: We can't auto-click because modern browsers block popups that aren't
          // from direct user gestures
        }
      } else if (checkRedirectPending) {
        const redirect = RedirectPending.remove('authGate')
        if (redirect) {
          navigate(redirect, { replace: true })
          return
        }
        AuthDomain.handleAuthed(navigate, auth)
      } else if (!requireNoReturnToForHandleAuthed || !returnTo) {
        // Only navigate home when there is no returnTo (when required). When returnTo is
        // present the same-origin broadcast relay sets sameOriginRedirect and the
        // declarative <Navigate> handles routing — calling handleAuthed here would race
        // with it.
        AuthDomain.handleAuthed(navigate, auth)
      }
    }
  }, [
    isRestoring,
    isAuthed,
    navigate,
    auth,
    ensureFreshJwtAndHandleAuthed,
    returnTo,
    checkRedirectPending,
    requireNoReturnToForHandleAuthed,
    deferHandleAuthForBroadcastRelay,
  ])

  const effectiveAuth = auth ?? broadcastAuth
  const effectiveIsAuthed = isAuthed || broadcastAuth !== null

  return {
    returnTo,
    broadcastAuth,
    sameOriginRedirect,
    effectiveAuth,
    effectiveIsAuthed,
    ensureFreshJwtAndHandleAuthed,
    isReturnToSameOrigin,
  }
}
