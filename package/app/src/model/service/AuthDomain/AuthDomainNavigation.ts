import {
  BrowserInterface,
  AuthDomainConfigInterface,
  AuthDomainNavigationInterface,
} from './types'

/**
 * AuthDomainNavigation
 *
 * Handles URL building and navigation/redirects for cross-domain authentication.
 */
export class AuthDomainNavigation implements AuthDomainNavigationInterface {
  constructor(
    private browserInterface: BrowserInterface,
    private config: AuthDomainConfigInterface,
  ) {}

  /**
   * Builds the returnTo URL for the current origin. Defaults to the configured auth home path;
   * pass a deep-link path (e.g. the current pathname + search) to preserve it across the
   * auth-domain round trip instead.
   */
  buildReturnToUrl = (path?: string): string => {
    const { origin } = this.browserInterface.getLocation()
    return `${origin}${path ?? this.config.getAuthHomePath()}`
  }

  /**
   * Builds a URL on the auth domain with optional query parameters
   */
  buildAuthDomainUrl = (
    path: string,
    params?: Record<string, string>,
  ): string => {
    const { protocol } = this.browserInterface.getLocation()
    const baseUrl = `${protocol}//${this.config.getAuthDomain()}${path}`

    if (params && Object.keys(params).length > 0) {
      const urlParams = new URLSearchParams(params)
      return `${baseUrl}?${urlParams}`
    }

    return baseUrl
  }

  /**
   * Redirects to the auth domain login page with returnTo parameter. Pass the current
   * deep-link path (pathname + search) to have the user land back where they started once
   * authenticated, instead of the fixed auth home path.
   */
  redirectToAuthDomain = (deepLinkPath?: string): void => {
    const returnTo = this.buildReturnToUrl(deepLinkPath)
    const url = this.buildAuthDomainUrl(this.config.getAuthLoginPath(), {
      returnTo,
    })
    this.browserInterface.setLocation(url)
  }
}
