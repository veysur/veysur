import { AuthData } from 'hook'

/**
 * Browser abstraction interface for dependency injection and testing
 */
export interface BrowserInterface {
  getLocation(): Location
  setLocation(url: string): void
  replaceHistoryState(url: string): void
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
}

/**
 * Navigation interface for URL building and redirects
 */
export interface AuthDomainNavigationInterface {
  redirectToAuthDomain(deepLinkPath?: string): void
  buildAuthDomainUrl(path: string, params?: Record<string, string>): string
  buildReturnToUrl(path?: string): string
}
