import { AuthData } from 'hook'
import { Registry, KEY_REGISTRY_SINGLE_PROJECT_REDIRECT_RESOLVER } from 'common'

import { SingleProjectRedirectResolver } from '../../AccountUiExtension'
import { BrowserInterface } from './types'
import { createBrowserInterface } from './BrowserInterface'
import { AuthDomainConfig } from './AuthDomainConfig'
import { AuthDomainValidator } from './AuthDomainValidator'
import { AuthDomainUI } from './AuthDomainUI'
import { AuthDomainWindow } from './AuthDomainWindow'
import { AuthDomainMessaging } from './AuthDomainMessaging'
import { AuthDomainNavigation } from './AuthDomainNavigation'

/**
 * Self-hosted default for `SingleProjectRedirectResolver` - unconditional,
 * since self-hosted only ever has the one, config-sourced project (no
 * `auth.user.projectOwn`/`projectAdmin` data to inspect). Cloud overrides
 * this via `Registry`, from the commercial package, with a resolver that
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
 */
export class AuthDomain {
  // Lazy-initialized sub-services
  private static _config: AuthDomainConfig | null = null
  private static _validator: AuthDomainValidator | null = null
  private static _ui: AuthDomainUI | null = null
  private static _window: AuthDomainWindow | null = null
  private static _messaging: AuthDomainMessaging | null = null
  private static _navigation: AuthDomainNavigation | null = null

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
    AuthDomain._window = null
    AuthDomain._messaging = null
    AuthDomain._navigation = null
    AuthDomain._transferInProgress = false
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

  private static getWindowService(): AuthDomainWindow {
    if (!AuthDomain._window) {
      AuthDomain._window = new AuthDomainWindow(
        AuthDomain.browserInterface,
        AuthDomain.getConfigService(),
        AuthDomain.getUIService(),
      )
    }
    return AuthDomain._window
  }

  private static getMessagingService(): AuthDomainMessaging {
    if (!AuthDomain._messaging) {
      AuthDomain._messaging = new AuthDomainMessaging(
        AuthDomain.browserInterface,
        AuthDomain.getWindowService(),
        AuthDomain.getUIService(),
      )
    }
    return AuthDomain._messaging
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

  // ============================================================================
  // Public API - Delegates to sub-services
  // All method signatures remain identical for backward compatibility
  // ============================================================================

  // Target window accessor for backward compatibility
  static get targetWindow(): Window | null {
    return AuthDomain.getWindowService().getTargetWindow()
  }

  static set targetWindow(window: Window | null) {
    AuthDomain.getWindowService().setTargetWindow(window)
  }

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

  // Window methods
  static prepareTargetWindow = (): Window | null => {
    return AuthDomain.getWindowService().prepareTargetWindow()
  }

  static closeTargetWindow = (): void => {
    AuthDomain.getWindowService().closeTargetWindow()
  }

  static isTargetWindowReady = (): boolean => {
    return AuthDomain.getWindowService().isTargetWindowReady()
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

  // Messaging methods
  static pollTargetWindowReady = (
    url: string,
    authData?: AuthData,
    onSettled?: () => void,
  ): void => {
    AuthDomain.getMessagingService().pollTargetWindowReady(
      url,
      authData,
      onSettled,
    )
  }

  static pollForAuthenticationComplete = (
    url: string,
    onSettled?: () => void,
  ): void => {
    AuthDomain.getMessagingService().pollForAuthenticationComplete(
      url,
      onSettled,
    )
  }

  // ============================================================================
  // Orchestration methods - Combine multiple sub-services
  // ============================================================================

  /**
   * True when `url` is on the same origin as the current page. In that case the
   * cross-origin auth handoff (popup + postMessage + localStorage) is
   * unnecessary: the session already lives in this origin's query cache /
   * persisted storage and survives a plain navigation. Gated on origin equality,
   * never on `edition` — cloud never hits it because every cross-app link is
   * cross-origin (per-app subdomains).
   */
  private static isSameOriginTarget = (url: string): boolean => {
    try {
      return new URL(url).origin === AuthDomain.browserInterface.getOrigin()
    } catch {
      return false
    }
  }

  static openTargetAndPostAuthData = (
    url: string,
    authData?: AuthData,
    onSettled?: () => void,
  ): void => {
    if (AuthDomain.isSameOriginTarget(url)) {
      AuthDomain.getWindowService().closeTargetWindow()
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

    const targetWindow = AuthDomain.getWindowService().getTargetWindow()
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = url
      AuthDomain.getMessagingService().pollTargetWindowReady(
        url,
        authData,
        onSettled,
      )
    } else {
      AuthDomain.browserInterface.setLocation(url)
      onSettled?.()
    }
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

      // No single-project redirect applies - close the speculative popup
      // AuthDomainWindow.prepareTargetWindow() opened at submit time (it
      // doesn't know in advance whether one will be needed) and hard-navigate
      // to the account app instead. Hard navigation: the account-domain home
      // path belongs to the account app, which may not be the app whose
      // router is currently mounted (self-hosted shares one host across
      // admin/account/survey) — navigate() would wrongly prefix the path
      // with the current app's own router basename. getAccountUrl() already
      // returns the correct full absolute URL.
      AuthDomain.closeTargetWindow()
      AuthDomain.browserInterface.setLocation(
        AuthDomain.getConfigService().getAccountUrl(),
      )
    } else {
      navigate(AuthDomain.getConfigService().getAuthHomePath())
    }
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
    AuthDomain.getWindowService().closeTargetWindow()

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
  // this, each call registers its own independent set of postMessage
  // listeners, and a single auth-complete signal fires all of them, each
  // navigating the tab in rapid succession and tripping the browser's
  // navigation-throttle protection (leaving the tab stuck mid-redirect).
  private static _transferInProgress = false

  private static clearTransferFlag = (): void => {
    AuthDomain._transferInProgress = false
  }

  /**
   * Opens an "about:blank" popup, refreshes the JWT, and returns the popup
   * window plus the auth data to transfer. Returns null if the popup could
   * not be opened or was closed/replaced while the refresh was in flight, or
   * if a transfer is already in progress.
   */
  private static popupAndRefreshAuth = async (
    authData: AuthData | null | undefined,
    authRefresh: () => Promise<AuthData | undefined>,
  ): Promise<{
    targetWindow: Window
    authToUse: AuthData | undefined
  } | null> => {
    if (AuthDomain._transferInProgress) {
      console.warn(
        'Auth transfer already in progress; ignoring duplicate request',
      )
      return null
    }
    AuthDomain._transferInProgress = true

    // Open popup window immediately (user gesture allows popup)
    const targetWindow = AuthDomain.getWindowService().createAuthPopup()
    AuthDomain.getWindowService().setTargetWindow(targetWindow)

    if (!targetWindow || targetWindow.closed) {
      console.error('Failed to open popup window')
      AuthDomain._transferInProgress = false
      return null
    }

    // Refresh JWT if needed before transfer
    let authToUse = authData ?? undefined
    try {
      const refreshedAuth = await authRefresh()
      if (refreshedAuth) {
        authToUse = refreshedAuth
      }
    } catch (error) {
      console.error('JWT refresh failed:', error)
    }

    // Guard against the popup being closed (or overwritten by a concurrent call)
    // while authRefresh was awaited — if so, bail out to avoid the setLocation
    // fallback in openTargetAndPostAuthData navigating the relay tab without auth.
    const currentTargetWindow = AuthDomain.getWindowService().getTargetWindow()
    if (currentTargetWindow !== targetWindow || targetWindow.closed) {
      console.warn(
        'Popup was closed or replaced before auth transfer; aborting',
      )
      AuthDomain._transferInProgress = false
      return null
    }

    return { targetWindow, authToUse }
  }

  /**
   * Opens a project in a new window and transfers authentication.
   * This is used from the auth domain (e.g., account app) to open a project
   * with auth already transferred.
   *
   * @param targetUrl - The URL to open (e.g., project login page)
   * @param authData - Current auth data to transfer
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

    const result = await AuthDomain.popupAndRefreshAuth(authData, authRefresh)
    if (!result) return

    AuthDomain.openTargetAndPostAuthData(
      targetUrl,
      result.authToUse,
      AuthDomain.clearTransferFlag,
    )
  }

  /**
   * Opens the account app (auth domain) in a new window and transfers
   * authentication. This is used from a project domain (e.g., admin app) to
   * hand off the user's session to the account app, symmetric to
   * openProjectWithAuth.
   *
   * @param authData - Current auth data to transfer
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

    const result = await AuthDomain.popupAndRefreshAuth(authData, authRefresh)
    if (!result) return

    AuthDomain.openTargetAndPostAuthData(
      accountUrl,
      result.authToUse,
      AuthDomain.clearTransferFlag,
    )
  }
}
