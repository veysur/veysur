import { AuthData } from 'hook'

/**
 * Browser abstraction interface for dependency injection and testing
 */
export interface BrowserInterface {
  getLocation(): Location
  setLocation(url: string): void
  openWindow(url: string, target: string): Window | null
  closeWindow(): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void
  getProtocol(): string
  getOrigin(): string
  getHost(): string
  getReferrer(): string
  reloadPage(): void
}

/**
 * Configuration interface for auth domain settings
 */
export interface AuthDomainConfigInterface {
  hasAuthDomain(): boolean
  getAuthDomain(): string
  onAuthDomain(): boolean
  getAuthHomePath(): string
  getAuthDomainHomePath(): string
  getAuthLoginPath(): string
  getAuthLogoutPath(): string
  getAccountUrl(path?: string): string
  getPlatformUrl(path?: string): string
  getDocsUrl(path?: string): string
  getAuthLoginUrl(path?: string): string
  getAdminUrl(host: string, path?: string): string
  getBypassDomains(): string[]
  shouldBypassAuthDomain(): boolean
}

/**
 * Validator interface for domain authorization
 */
export interface AuthDomainValidatorInterface {
  isTargetDomainAuthorized(url: string, authData?: AuthData): boolean
  getHostFromUrl(url: string): string | null
  getAuthorizedDomains(authData?: AuthData): Set<string | null | undefined>
}

/**
 * UI interface for visual feedback rendering
 */
export interface AuthDomainUIInterface {
  showRedirectOverlay(): void
  applyPopupStyles(doc: Document): void
  injectThemeScript(doc: Document): void
}

/**
 * Window interface for popup lifecycle management
 */
export interface AuthDomainWindowInterface {
  createAuthPopup(): Window | null
  prepareTargetWindow(): Window | null
  closeTargetWindow(): void
  isTargetWindowReady(): boolean
  getTargetWindow(): Window | null
  setTargetWindow(window: Window | null): void
}

/**
 * Messaging interface for postMessage protocol
 */
export interface AuthDomainMessagingInterface {
  pollTargetWindowReady(
    url: string,
    authData?: AuthData,
    onSettled?: () => void,
  ): void
  pollForAuthenticationComplete(url: string, onSettled?: () => void): void
}

/**
 * Navigation interface for URL building and redirects
 */
export interface AuthDomainNavigationInterface {
  redirectToAuthDomain(deepLinkPath?: string): void
  buildAuthDomainUrl(path: string, params?: Record<string, string>): string
  buildReturnToUrl(path?: string): string
}
