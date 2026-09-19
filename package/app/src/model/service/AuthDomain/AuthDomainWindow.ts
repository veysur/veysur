import {
  BrowserInterface,
  AuthDomainConfigInterface,
  AuthDomainUIInterface,
  AuthDomainWindowInterface,
} from './types'

/**
 * AuthDomainWindow
 *
 * Manages popup window lifecycle for cross-domain authentication.
 * Handles creation, styling, and state tracking of auth popup windows.
 */
export class AuthDomainWindow implements AuthDomainWindowInterface {
  private targetWindow: Window | null = null

  constructor(
    private browserInterface: BrowserInterface,
    private config: AuthDomainConfigInterface,
    private ui: AuthDomainUIInterface,
  ) {}

  /**
   * Gets the current target window
   */
  getTargetWindow = (): Window | null => {
    return this.targetWindow
  }

  /**
   * Sets the target window (for external management)
   */
  setTargetWindow = (window: Window | null): void => {
    this.targetWindow = window
  }

  /**
   * Creates and styles a popup window with loading message and theme support.
   * Used by prepareTargetWindow and openProjectWithAuth.
   */
  createAuthPopup = (): Window | null => {
    const targetWindow = this.browserInterface.openWindow(
      'about:blank',
      '_blank',
    )

    if (!targetWindow) {
      return null
    }

    const doc = targetWindow.document

    // Inject theme detection script to prevent white flash
    this.ui.injectThemeScript(doc)

    // Apply popup styles
    this.ui.applyPopupStyles(doc)

    return targetWindow
  }

  /**
   * Prepares a target window for cross-domain authentication, synchronously
   * at login-form-submit time so the popup opens within the click's user
   * gesture (browsers block `window.open()` calls made later, e.g. from an
   * async effect once the login response and target project are known).
   * Only relevant when on the auth domain (self-hosted has no separate auth
   * domain, so `hasAuthDomain()` is always false there and this always
   * returns null - self-hosted's redirect is same-origin and never needs a
   * popup). Speculative: opened on every auth-domain login attempt, not just
   * ones with a `returnTo` param, since `AuthDomain.handleAuthed()` may also
   * need it for a same-project-count redirect discovered only after login
   * resolves; the caller closes it via `closeTargetWindow()` if unused.
   */
  prepareTargetWindow = (): Window | null => {
    if (!this.config.hasAuthDomain() || !this.config.onAuthDomain()) {
      return null
    }

    this.targetWindow = this.createAuthPopup()
    return this.targetWindow
  }

  /**
   * Closes the target window and clears the reference
   */
  closeTargetWindow = (): void => {
    if (this.targetWindow) {
      this.targetWindow.close()
      this.targetWindow = null
    }
  }

  /**
   * Checks if the target window is ready to receive messages
   */
  isTargetWindowReady = (): boolean => {
    if (!this.targetWindow || this.targetWindow.closed) {
      return false
    }

    try {
      // Try to access window properties that indicate readiness
      const location = this.targetWindow.location
      const document = this.targetWindow.document

      // If we can access these properties and the location has changed from about:blank
      // and the document is in a loaded state, the window is likely ready
      return (
        location.href !== 'about:blank' && document.readyState === 'complete'
      )
    } catch {
      // Cross-origin access will throw an error
      // In this case, we assume the window has navigated to the target domain
      // and is likely ready (or at least as ready as we can determine)
      return true
    }
  }
}
