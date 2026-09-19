import React from 'react'

import { AuthData } from 'hook/useAuth'
import { AuthDomain } from 'model'

interface AuthLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  targetUrl: string
  auth?: AuthData | null
  authRefresh?: () => Promise<AuthData | undefined>
  loginPath?: string
  onNavigate?: () => void
  openWithAuth?: (
    targetUrl: string,
    auth: AuthData | null | undefined,
    authRefresh: () => Promise<AuthData | undefined>,
  ) => Promise<void>
  children?: React.ReactNode
}

export const AuthLink = React.forwardRef<HTMLAnchorElement, AuthLinkProps>(
  (
    {
      targetUrl,
      auth,
      authRefresh,
      loginPath = '/login',
      onNavigate,
      openWithAuth = AuthDomain.openProjectWithAuth,
      onClick,
      children,
      ...rest
    },
    ref,
  ) => {
    const relayHref = `${loginPath}?${new URLSearchParams({ returnTo: targetUrl }).toString()}`

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e)
      if (e.defaultPrevented) return
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      if (onNavigate) {
        onNavigate()
      } else if (auth !== undefined && authRefresh) {
        openWithAuth(targetUrl, auth, authRefresh)
      }
    }

    return (
      <a ref={ref} href={relayHref} onClick={handleClick} {...rest}>
        {children}
      </a>
    )
  },
)

AuthLink.displayName = 'AuthLink'
