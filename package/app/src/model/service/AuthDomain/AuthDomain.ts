import { AuthData } from 'hook'
import { Registry, KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER } from 'common'
import {
  KEY_STATE_AUTH,
  KEY_STATE_REMEMBER_ME,
  KEY_STORAGE_AUTH_HANDOFF,
} from 'common/keyState'
import { queryClient } from 'common/queryClient'
import { ApiAuthHandoff } from 'model/api/ApiAuthHandoff'
import { getRestClient } from 'registry/getRestClient'

import { SingleProjectRedirectResolver } from '../../AccountUiExtension'
import { BrowserInterface } from './types'
import { createBrowserInterface } from './BrowserInterface'
import { AuthDomainConfig } from './AuthDomainConfig'
import { AuthDomainValidator } from './AuthDomainValidator'
import { AuthDomainUI } from './AuthDomainUI'
import { AuthDomainNavigation } from './AuthDomainNavigation'

/**
 * Self-hosted default for `SingleProjectRedirectResolver` - unconditional,
 * since self-hosted only ever has the one, config-sourced project (no
 * `auth.user.projectOwn`/`projectAdmin` data to inspect). An extension can override
 * this via `Registry` with a resolver that
 * only returns a URL when the authenticated user has exactly one usable
 * project.
 */
const selfHostedSingleProjectRedirectResolver: SingleProjectRedirectResolver = {
  resolve: () => AuthDomain.getAdminUrl(AuthDomain.browserInterface.getHost()),
}

/**
 * AuthDomain - Cross-domain authentication facade.
 *
 * Orchestrates specialized sub-services for centralized JWT-based authentication
 * across multiple client domains. See README.md for detailed flow documentation.
 *
 * Cross-domain transfer is a server-side handoff: the initiating domain mints a
 * short-lived, single-use token (POST /auth-handoff, derived from the caller's own
 * authenticated request - never from client input) and does a plain top-level
 * redirect with `?auth-handoff=<token>`; the target domain redeems it
 * (POST /auth-handoff/redeem) before rendering. No popup, no postMessage.
 */
export class AuthDomain {
  // Lazy-initialized sub-services
  private static _config: AuthDomainConfig | null = null
  private static _validator: AuthDomainValidator | null = null
  private static _ui: AuthDomainUI | null = null
  private static _navigation: AuthDomainNavigation | null = null
  private static _apiAuthHandoff: ApiAuthHandoff | null = null

  /**
   * Browser interface for dependency injection (testing)
   * Can be replaced before first service access
   */
  static browserInterface: BrowserInterface = createBrowserInterface()

  /**
   * Resets all services (for testing)
   * Call after mocking browserInterface to reinitialize services
   */
  static resetServices = (): void => {
    AuthDomain._config = null
    AuthDomain._validator = null
    AuthDomain._ui = null
    AuthDomain._navigation = null
    AuthDomain._apiAuthHandoff = null
    AuthDomain._transferInProgress = false
    AuthDomain._loginJustSubmitted = false
  }

  // Lazy-initialized service getters
  private static getConfigService(): AuthDomainConfig {
    if (!AuthDomain._config) {
      AuthDomain._config = new AuthDomainConfig(AuthDomain.browserInterface)
    }
    return AuthDomain._config
  }

  private static getValidatorService(): AuthDomainValidator {
    if (!AuthDomain._validator) {
      AuthDomain._validator = new AuthDomainValidator()
    }
    return AuthDomain._validator
  }

  private static getUIService(): AuthDomainUI {
    if (!AuthDomain._ui) {
      AuthDomain._ui = new AuthDomainUI()
    }
    return AuthDomain._ui
  }

  private static getNavigationService(): AuthDomainNavigation {
    if (!AuthDomain._navigation) {
      AuthDomain._navigation = new AuthDomainNavigation(
        AuthDomain.browserInterface,
        AuthDomain.getConfigService(),
      )
    }
    return AuthDomain._navigation
  }

  private static getApiAuthHandoff(): ApiAuthHandoff {
    if (!AuthDomain._apiAuthHandoff) {
      AuthDomain._apiAuthHandoff = new ApiAuthHandoff(getRestClient())
    }
    return AuthDomain._apiAuthHandoff
  }

  // ============================================================================
  // Public API - Delegates to sub-services
  // All method signatures remain identical for backward compatibility
  // ============================================================================

  // Config methods
  static hasAuthDomain = (): boolean => {
    return AuthDomain.getConfigService().hasAuthDomain()
  }

  static getAuthDomain = (): string => {
    return AuthDomain.getConfigService().getAuthDomain()
  }

  static onAuthDomain = (): boolean => {
    return AuthDomain.getConfigService().onAuthDomain()
  }

  static getAuthHomePath = (): string => {
    return AuthDomain.getConfigService().getAuthHomePath()
  }

  static getAuthDomainHomePath = (): string => {
    return AuthDomain.getConfigService().getAuthDomainHomePath()
  }

  static getAuthLoginPath = (): string => {
    return AuthDomain.getConfigService().getAuthLoginPath()
  }

  static getAuthLogoutPath = (): string => {
    return AuthDomain.getConfigService().getAuthLogoutPath()
  }

  static getAccountUrl = (path?: string): string => {
    return AuthDomain.getConfigService().getAccountUrl(path)
  }

  static getPlatformUrl = (path?: string): string => {
    return AuthDomain.getConfigService().getPlatformUrl(path)
  }

  static getDocsUrl = (path?: string): string => {
    return AuthDomain.getConfigService().getDocsUrl(path)
  }

  static getAuthLoginUrl = (path?: string): string => {
    return AuthDomain.getConfigService().getAuthLoginUrl(path)
  }

  static getAdminUrl = (host: string, path?: string): string => {
    return AuthDomain.getConfigService().getAdminUrl(host, path)
  }

  static getBypassDomains = (): string[] => {
    return AuthDomain.getConfigService().getBypassDomains()
  }

  static shouldBypassAuthDomain = (): boolean => {
    return AuthDomain.getConfigService().shouldBypassAuthDomain()
  }

  // Navigation methods
  static redirectToAuthDomain = (deepLinkPath?: string): void => {
    AuthDomain.getNavigationService().redirectToAuthDomain(deepLinkPath)
  }

  // Validator methods
  static isTargetDomainAuthorized = (
    url: string,
    authData?: AuthData,
  ): boolean => {
    if (
      AuthDomain.getValidatorService().isTargetDomainAuthorized(url, authData)
    ) {
      return true
    }
    // Platform and account domains are always trusted, matching the logic in
    // openTargetAndPostAuthData
    const platformHost = AuthDomain.getValidatorService().getHostFromUrl(
      AuthDomain.getConfigService().getPlatformUrl(),
    )
    const accountHost = AuthDomain.getValidatorService().getHostFromUrl(
      AuthDomain.getConfigService().getAccountUrl(),
    )
    const targetHost = AuthDomain.getValidatorService().getHostFromUrl(url)
    return (
      (platformHost !== null && platformHost === targetHost) ||
      (accountHost !== null && accountHost === targetHost)
    )
  }

  static getHostFromUrl = (url: string): string | null => {
    return AuthDomain.getValidatorService().getHostFromUrl(url)
  }

  // ============================================================================
  // Orchestration methods - Combine multiple sub-services
  // ============================================================================

  /**
   * True when `url` is on the same origin as the current page. In that case the
   * cross-origin auth handoff (mint token + redirect + redeem) is unnecessary:
   * the session already lives in this origin's query cache / persisted storage
   * and survives a plain navigation. Gated on origin equality, never on
   * `edition` - cloud never hits it because every cross-app link is
   * cross-origin (per-app subdomains).
   */
  private static isSameOriginTarget = (url: string): boolean => {
    try {
      return new URL(url).origin === AuthDomain.browserInterface.getOrigin()
    } catch {
      return false
    }
  }

  /**
   * Mints a handoff token from this (authenticated) domain and does a plain
   * top-level redirect to `url` carrying it as `?auth-handoff=<token>`. The
   * server derives the session payload entirely from the current request's
   * own JWT/access-token - nothing sensitive is built or sent by the client.
   */
  private static mintTokenAndRedirect = async (
    url: string,
    onSettled?: () => void,
  ): Promise<void> => {
    AuthDomain.getUIService().showRedirectOverlay()

    try {
      const rememberMe =
        queryClient.getQueryData<boolean>([KEY_STATE_REMEMBER_ME]) ?? false
      const { token } = await AuthDomain.getApiAuthHandoff().create(rememberMe)
      const redirectUrl = new URL(url)
      redirectUrl.searchParams.set('auth-handoff', token)
      AuthDomain.browserInterface.setLocation(redirectUrl.toString())
    } catch (error) {
      console.error('Failed to mint auth handoff token:', error)
      // Fall through to a plain navigation - the target domain will simply
      // render unauthenticated, the same failure mode as today's popup timeout.
      AuthDomain.browserInterface.setLocation(url)
    }

    onSettled?.()
  }

  /**
   * `authData` is used only to compute which domains this call is allowed to
   * transfer a session to (the user's own project subdomains) - it is never
   * sent to the server. The server derives the actual session payload from
   * the caller's own authenticated request when the token is minted.
   */
  static openTargetAndPostAuthData = (
    url: string,
    authData?: AuthData,
    onSettled?: () => void,
  ): void => {
    if (AuthDomain.isSameOriginTarget(url)) {
      AuthDomain.browserInterface.setLocation(url)
      onSettled?.()
      return
    }

    const targetHost = AuthDomain.getValidatorService().getHostFromUrl(url)
    const accountHost = AuthDomain.getValidatorService().getHostFromUrl(
      AuthDomain.getConfigService().getAccountUrl(),
    )
    const targetIsAccountDomain =
      accountHost !== null && accountHost === targetHost

    // Allowed when transferring from the auth domain to one of the user's
    // domains (existing flow), or from a project domain to the account
    // domain (reverse "Manage Account" flow).
    if (
      !AuthDomain.getConfigService().onAuthDomain() &&
      !targetIsAccountDomain
    ) {
      onSettled?.()
      return
    }

    // Get authorized domains from validator
    const authDomains =
      AuthDomain.getValidatorService().getAuthorizedDomains(authData)

    // Platform domain is always trusted (internal subdomain of the auth domain)
    const platformHost = AuthDomain.getValidatorService().getHostFromUrl(
      AuthDomain.getConfigService().getPlatformUrl(),
    )
    if (platformHost) authDomains.add(platformHost)

    // Account domain is always trusted (the user's own auth domain)
    if (accountHost) authDomains.add(accountHost)

    if (!authDomains.has(targetHost)) {
      console.warn(
        'Auth data can not be passed to an untrusted domain:',
        targetHost,
      )
      onSettled?.()
      return
    }

    void AuthDomain.mintTokenAndRedirect(url, onSettled)
  }

  static handleAuthed = (
    navigate: (path: string) => void,
    auth?: AuthData,
  ): void => {
    const urlParams = new URLSearchParams(
      AuthDomain.browserInterface.getLocation().search,
    )
    const returnTo = urlParams.get('returnTo') || ''

    if (
      AuthDomain.getConfigService().hasAuthDomain() &&
      AuthDomain.getConfigService().onAuthDomain() &&
      returnTo &&
      returnTo != ''
    ) {
      AuthDomain.openTargetAndPostAuthData(returnTo, auth)
    } else if (AuthDomain.getConfigService().onAuthDomain()) {
      const singleProjectUrl = Registry.getInstance()
        .get(
          KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER,
          () => selfHostedSingleProjectRedirectResolver,
        )
        .resolve(auth)
      if (singleProjectUrl) {
        AuthDomain.openTargetAndPostAuthData(singleProjectUrl, auth)
        return
      }

      // No single-project redirect applies - hard-navigate to the account app.
      // Hard navigation: the account-domain home path belongs to the account
      // app, which may not be the app whose router is currently mounted
      // (self-hosted shares one host across admin/account/survey) -
      // navigate() would wrongly prefix the path with the current app's own
      // router basename. getAccountUrl() already returns the correct full
      // absolute URL.
      AuthDomain.browserInterface.setLocation(
        AuthDomain.getConfigService().getAccountUrl(),
      )
    } else {
      navigate(AuthDomain.getConfigService().getAuthHomePath())
    }
  }

  // Set synchronously by the login form's submit handler (replacing the old
  // prepareTargetWindow() popup-open call, which doubled as this same signal)
  // so useAuthLoginRedirect can tell a just-submitted "New Login" apart from
  // an already-authenticated page load, without needing a popup window to
  // check for. Consumed once so a stale flag can't cause a later, unrelated
  // auth state change to auto-proceed.
  private static _loginJustSubmitted = false

  static markLoginSubmitted = (): void => {
    AuthDomain._loginJustSubmitted = true
  }

  static clearLoginSubmitted = (): void => {
    AuthDomain._loginJustSubmitted = false
  }

  static consumeLoginJustSubmitted = (): boolean => {
    const value = AuthDomain._loginJustSubmitted
    AuthDomain._loginJustSubmitted = false
    return value
  }

  static handleAuth = (): void => {
    // Skip redirect for domains in the bypass list (e.g., localhost, test environments)
    if (AuthDomain.getConfigService().shouldBypassAuthDomain()) {
      return
    }

    if (!AuthDomain.getConfigService().onAuthDomain()) {
      if (
        !AuthDomain.browserInterface.getReferrer() ||
        !AuthDomain.browserInterface
          .getReferrer()
          .includes(AuthDomain.getConfigService().getAuthDomain())
      ) {
        AuthDomain.redirectToAuthDomain()
      }
    }
  }

  static handleLogout = (): void => {
    if (
      AuthDomain.getConfigService().hasAuthDomain() &&
      !AuthDomain.getConfigService().onAuthDomain()
    ) {
      const { protocol, origin } = AuthDomain.browserInterface.getLocation()
      const params = new URLSearchParams({
        returnTo: `${origin}${AuthDomain.getConfigService().getAuthHomePath()}`,
      })
      AuthDomain.browserInterface.setLocation(
        `${protocol}//${AuthDomain.getConfigService().getAuthDomain()}${AuthDomain.getConfigService().getAuthLogoutPath()}?${params}`,
      )
    }
  }

  // Guards against a second "open with auth" transfer starting while one is
  // already in flight (e.g. a fast double-click on "Manage Account") — without
  // this, each call would independently mint a token and redirect, tripping
  // the browser's navigation-throttle protection.
  private static _transferInProgress = false

  private static clearTransferFlag = (): void => {
    AuthDomain._transferInProgress = false
  }

  /**
   * Refreshes the JWT before a cross-domain transfer (so the mint request
   * carries a non-expired token), guarding against a duplicate concurrent
   * transfer. Returns the refreshed auth data to use for the domain-
   * authorization check, or null if a transfer is already in progress.
   */
  private static refreshAuthForTransfer = async (
    authData: AuthData | null | undefined,
    authRefresh: () => Promise<AuthData | undefined>,
  ): Promise<AuthData | undefined | null> => {
    if (AuthDomain._transferInProgress) {
      console.warn(
        'Auth transfer already in progress; ignoring duplicate request',
      )
      return null
    }
    AuthDomain._transferInProgress = true

    let authToUse = authData ?? undefined
    try {
      const refreshedAuth = await authRefresh()
      if (refreshedAuth) {
        authToUse = refreshedAuth
      }
    } catch (error) {
      console.error('JWT refresh failed:', error)
    }

    return authToUse
  }

  /**
   * Opens a project and transfers authentication via the server-side handoff.
   * This is used from the auth domain (e.g., account app) to open a project
   * with auth already transferred.
   *
   * @param targetUrl - The URL to open (e.g., project login page)
   * @param authData - Current auth data (used only for the domain-authorization check)
   * @param authRefresh - Function to refresh JWT before transfer
   */
  static openProjectWithAuth = async (
    targetUrl: string,
    authData: AuthData | null | undefined,
    authRefresh: () => Promise<AuthData | undefined>,
  ): Promise<void> => {
    if (!AuthDomain.getConfigService().onAuthDomain()) {
      console.warn('openProjectWithAuth should only be called from auth domain')
      return
    }

    if (AuthDomain.isSameOriginTarget(targetUrl)) {
      AuthDomain.browserInterface.setLocation(targetUrl)
      return
    }

    const authToUse = await AuthDomain.refreshAuthForTransfer(
      authData,
      authRefresh,
    )
    if (authToUse === null) return

    AuthDomain.openTargetAndPostAuthData(
      targetUrl,
      authToUse,
      AuthDomain.clearTransferFlag,
    )
  }

  /**
   * Opens the account app (auth domain) and transfers authentication via the
   * server-side handoff. This is used from a project domain (e.g., admin app)
   * to hand off the user's session to the account app, symmetric to
   * openProjectWithAuth.
   *
   * @param authData - Current auth data (used only for the domain-authorization check)
   * @param authRefresh - Function to refresh JWT before transfer
   */
  static openAccountWithAuth = async (
    authData: AuthData | null | undefined,
    authRefresh: () => Promise<AuthData | undefined>,
  ): Promise<void> => {
    const accountUrl = AuthDomain.getAccountUrl()
    if (AuthDomain.isSameOriginTarget(accountUrl)) {
      AuthDomain.browserInterface.setLocation(accountUrl)
      return
    }

    const authToUse = await AuthDomain.refreshAuthForTransfer(
      authData,
      authRefresh,
    )
    if (authToUse === null) return

    AuthDomain.openTargetAndPostAuthData(
      accountUrl,
      authToUse,
      AuthDomain.clearTransferFlag,
    )
  }

  /**
   * Consumes an incoming `?auth-handoff=<token>` query param, if present: redeems
   * it against this domain's own API and applies the resulting `{auth,
   * rememberMe}` directly to the query cache.
   *
   * Writes to the same `localStorage` handoff key `queryClient.ts`'s own
   * module-init read consumes (kept for the `debug-mint-token.ts` dev/e2e
   * session-injection path - see `package/api-cloud/AGENTS.md`), but does not
   * rely on that read running afterwards: by the time this method executes,
   * this module's own import chain has almost certainly already pulled in and
   * evaluated `common/queryClient.ts` (it finds nothing then, since the token
   * hasn't been redeemed yet), so `queryClient.setQueryData(...)` is called
   * directly here as the actual mechanism.
   *
   * Must be awaited before the app renders (see each sub-app's bootstrap
   * entry, `index.tsx`). No-ops if the param is absent. Strips the param from
   * the visible URL in both the success and failure case - an expired/invalid
   * token just falls through to the normal unauthenticated flow, the same
   * failure mode as the old popup's timeout.
   */
  static consumeIncomingHandoffIfPresent = async (): Promise<void> => {
    const location = AuthDomain.browserInterface.getLocation()
    const params = new URLSearchParams(location.search)
    const token = params.get('auth-handoff')
    if (!token) return

    try {
      const { auth, rememberMe } = await AuthDomain.getApiAuthHandoff().redeem(
        token,
      )
      localStorage.setItem(
        KEY_STORAGE_AUTH_HANDOFF,
        JSON.stringify({ auth, rememberMe }),
      )
      // Order matters: rememberMe must be set before auth - see the matching
      // comment in queryClient.ts.
      queryClient.setQueryData([KEY_STATE_REMEMBER_ME], rememberMe ?? false)
      queryClient.setQueryData([KEY_STATE_AUTH], auth ?? null)
    } catch (error) {
      console.error('Failed to redeem auth handoff token:', error)
    } finally {
      params.delete('auth-handoff')
      const query = params.toString()
      const newUrl =
        location.pathname + (query ? `?${query}` : '') + (location.hash || '')
      AuthDomain.browserInterface.replaceHistoryState(newUrl)
    }
  }
}
