import type { ComponentType } from 'react'
import type { AuthData } from 'hook'

/**
 * Extension points an extension uses to inject its own UI into shared
 * `appAccount` shell components/pages without core knowing what that UI is.
 * See `registry/getAccountFooterExtraNav.ts` / `registry/getLoginExtraContent.ts`.
 */
export type AccountFooterExtraNav = ComponentType

export interface LoginExtraContentProps {
  returnTo?: string | null
}

export type LoginExtraContent = ComponentType<LoginExtraContentProps>

export type ProfileDangerZoneExtra = ComponentType

/**
 * A single navbar link in `appAccount`'s top nav. `external: true` means
 * `path` is already a full cross-app URL (e.g. the self-hosted admin app,
 * served from a different SPA bundle) rather than a route within the
 * account app - such links must not go through react-router `navigate()`,
 * and must not have the account app's origin prepended.
 */
export interface AccountNavItem {
  label: string
  // A generic component shape, not lucide-react's own `LucideIcon` type -
  // an extension may have its own separate `lucide-react` install, and
  // typing this against the exact `LucideIcon` type causes a cross-package
  // nominal mismatch even though the actual icon components are
  // structurally compatible.
  icon: ComponentType<{ className?: string }>
  path: string
  tooltip: string
  external?: boolean
}

/**
 * Supplies the complete, edition-specific set of `appAccount` navbar items
 * (including edition-invariant entries like "Profile") - see
 * `registry/getAccountNavProvider.ts`.
 */
export interface AccountNavProvider {
  getNavItems(): AccountNavItem[]
}

/**
 * Resolves where to send a just-authenticated user instead of the normal
 * account landing (project list / profile) when they have exactly one
 * usable project to work in - consulted only from the login-redirect flow
 * (`AuthDomain.handleAuthed()`), never on a later, ordinary visit to the
 * account app's root. Self-hosted's default (defined alongside
 * `AuthDomain.handleAuthed()` itself, since self-hosted has no multi-project
 * data to inspect) always returns the current host's admin URL - self-hosted
 * only ever has the one project. An extension can register a resolver that inspects
 * `auth.user.projectOwn`/`projectAdmin` and only returns a URL when there is
 * exactly one usable (active) project.
 */
export interface SingleProjectRedirectResolver {
  resolve(auth: AuthData | undefined): string | null
}
