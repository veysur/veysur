import { BrowserInterface, AuthDomainConfigInterface } from './types'

/**
 * AuthDomainConfig
 *
 * Handles all configuration-related operations for cross-domain authentication.
 * Reads from environment variables and provides helper methods for path/URL building.
 */
export class AuthDomainConfig implements AuthDomainConfigInterface {
  constructor(private browserInterface: BrowserInterface) {}

  /**
   * Checks if a central auth domain is configured
   */
  hasAuthDomain = (): boolean => {
    const authDomain = process.env.PUBLIC_AUTHENTICATION_DOMAIN
    return authDomain !== undefined && authDomain !== ''
  }

  /**
   * Gets the configured auth domain, or falls back to current host
   */
  getAuthDomain = (): string => {
    return (
      (process.env.PUBLIC_AUTHENTICATION_DOMAIN !== '' &&
        process.env.PUBLIC_AUTHENTICATION_DOMAIN) ||
      this.browserInterface.getHost()
    )
  }

  /**
   * Checks if the current window is on the auth domain
   */
  onAuthDomain = (): boolean => {
    return this.browserInterface.getHost() === this.getAuthDomain()
  }

  /**
   * Gets the home path for project domains (after authentication)
   */
  getAuthHomePath = (): string => {
    return process.env.PUBLIC_AUTHENTICATION_HOME_PATH || '/admin'
  }

  /**
   * Gets the home path for the auth domain itself. Falls back to
   * `PUBLIC_BASE_ACCOUNT` (the account app's own path prefix, e.g. `/account`
   * in a self-hosted single-origin deployment — see
   * `package/k8s/docs/infrastructure/self-hosted-routing.md`) rather than a
   * bare `/`, since on a single origin `getAccountUrl()`'s host falls back to
   * the current host (`getAuthDomain()` below) and a bare `/` would land on
   * whichever app is actually mounted at that origin's root, not the account
   * app. Trailing-slash-normalised, since `PUBLIC_BASE_ACCOUNT` (no trailing
   * slash, e.g. `/account`) and this home path (needs one, e.g. `/account/`,
   * so an appended path doesn't run into the prefix) use different
   * conventions.
   */
  getAuthDomainHomePath = (): string => {
    // The build bakes `PUBLIC_BASE_ACCOUNT` into the explicit variable when it
    // is unset, so both sources need the same normalisation.
    const homePath =
      process.env.PUBLIC_AUTHENTICATION_DOMAIN_HOME_PATH ||
      process.env.PUBLIC_BASE_ACCOUNT
    if (homePath) {
      return homePath.endsWith('/') ? homePath : `${homePath}/`
    }
    return '/'
  }

  /**
   * Gets the login path on the auth domain
   */
  getAuthLoginPath = (): string => {
    return process.env.PUBLIC_AUTHENTICATION_LOGIN_PATH || '/login'
  }

  /**
   * Gets the logout path on the auth domain
   */
  getAuthLogoutPath = (): string => {
    return process.env.PUBLIC_AUTHENTICATION_LOGOUT_PATH || '/logout'
  }

  /**
   * Gets the full URL to the account app on the auth domain, optionally with a
   * path appended (e.g. `getAccountUrl('password-reset')`) — never build this
   * URL by hand-concatenating a domain and path elsewhere, since the home path
   * differs per edition (cloud subdomain vs. self-hosted path-prefix, see
   * `package/k8s/docs/infrastructure/self-hosted-routing.md`)
   */
  getAccountUrl = (path = ''): string => {
    const protocol = this.browserInterface.getProtocol()
    return `${protocol}//${this.getAuthDomain()}${this.getAuthDomainHomePath()}${path}`
  }

  /**
   * Gets the full URL to the documentation site, optionally with a path appended
   */
  getDocsUrl = (path = ''): string => {
    const protocol = this.browserInterface.getProtocol()
    const docsDomain =
      process.env.PUBLIC_DOCS_DOMAIN ||
      `docs.${process.env.PUBLIC_APP_DOMAIN || 'veysur.local'}`
    return `${protocol}//${docsDomain}/${path}`
  }

  /**
   * Gets the full URL to the auth domain login page, optionally with a path appended
   */
  getAuthLoginUrl = (path = ''): string => {
    const protocol = this.browserInterface.getProtocol()
    return `${protocol}//${this.getAuthDomain()}${this.getAuthLoginPath()}${path}`
  }

  /**
   * Gets the full URL to the platform admin app (platform subdomain of the app
   * domain), optionally with a path appended
   */
  getPlatformUrl = (path = ''): string => {
    const protocol = this.browserInterface.getProtocol()
    const appDomain = process.env.PUBLIC_APP_DOMAIN || 'veysur.local'
    return `${protocol}//platform.${appDomain}/${path}`
  }

  /**
   * Gets the full URL to a project's admin app given its host (the cloud
   * per-project admin subdomain, e.g. from `CloudProject.subdomain`), optionally
   * with a path appended. Centralizes the `PUBLIC_BASE_ADMIN` path prefix so it
   * isn't hand-copied at every project-navigation call site (project switcher,
   * project list, billing pages).
   */
  getAdminUrl = (host: string, path = ''): string => {
    const { protocol, port } = this.browserInterface.getLocation()
    const adminBasePath = process.env.PUBLIC_BASE_ADMIN || '/admin'
    // Cloud passes a bare project hostname and inherits the page's port;
    // self-hosted passes `window.location.host`, which already carries it.
    const hostWithPort = /:\d+$/.test(host) || !port ? host : `${host}:${port}`
    return `${protocol}//${hostWithPort}${adminBasePath}${path}`
  }

  /**
   * Gets the list of domains that bypass auth domain redirect
   */
  getBypassDomains = (): string[] => {
    const bypassDomainsEnv =
      process.env.PUBLIC_AUTHENTICATION_BYPASS_DOMAINS || ''
    if (!bypassDomainsEnv || bypassDomainsEnv.trim() === '') {
      return []
    }
    return bypassDomainsEnv
      .split(',')
      .map((domain) => domain.trim())
      .filter(Boolean)
  }

  /**
   * Checks if the current domain should bypass auth domain redirect
   */
  shouldBypassAuthDomain = (): boolean => {
    const bypassDomains = this.getBypassDomains()
    if (bypassDomains.length === 0) {
      return false
    }
    const currentHost = this.browserInterface.getHost()
    return bypassDomains.includes(currentHost)
  }
}
