import React, { ReactNode } from 'react'
import { useIsRestoring } from '@tanstack/react-query'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from 'hook'
import { AuthDomain } from 'model/service/AuthDomain/AuthDomain'
import { RedirectPending } from 'model'

export type AuthGateProps = {
  children: ReactNode
  loginPath?: string
  requireEmailVerified?: boolean
}

export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  loginPath = '/login',
  requireEmailVerified = false,
}) => {
  const { isAuthed, auth } = useAuth()
  const isRestoring = useIsRestoring()
  const location = useLocation()
  const deepLink = location.pathname + location.search

  // Defer the auth decision until the persisted session cache has finished restoring —
  // otherwise an already-authenticated user on a cold tab would be bounced to login before
  // their real session had a chance to load.
  if (isRestoring) {
    return null
  }
  if (!isAuthed) {
    // If auth domain is configured and we're not on it (and not bypassed), redirect to auth
    // domain, preserving the current deep link as the returnTo so the user lands back where
    // they started once authenticated (RedirectPending can't help here — it's scoped to this
    // origin's session/local storage and won't survive the cross-domain hop).
    if (
      AuthDomain.hasAuthDomain() &&
      !AuthDomain.onAuthDomain() &&
      !AuthDomain.shouldBypassAuthDomain()
    ) {
      AuthDomain.redirectToAuthDomain(deepLink)
      return null
    }
    RedirectPending.push('authGate', deepLink)
    return <Navigate to={loginPath} replace />
  }
  if (auth?.user?.deletedAt) {
    return <Navigate to="/account-deletion-pending" replace />
  }
  if (
    requireEmailVerified &&
    !auth?.user?.emailMeta?.verify?.status?.isVerified
  ) {
    return <Navigate to="/verify-email" replace />
  }
  return children
}
