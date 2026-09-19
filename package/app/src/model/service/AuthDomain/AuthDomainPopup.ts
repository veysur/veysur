import { AuthData } from 'hook'

import { KEY_STORAGE_AUTH_HANDOFF } from 'common/keyState'

type AuthHandoffPayload = {
  auth: AuthData
  rememberMe: boolean
}

/**
 * AuthDomainPopup
 *
 * Handles authentication logic for popup windows opened during cross-domain auth.
 *
 * Flow:
 * 1. Popup window is opened by auth domain (via AuthDomain.prepareTargetWindow)
 * 2. This popup listens for auth messages from the opener window
 * 3. Once auth data is received, it is written to a localStorage handoff key
 *    (localStorage is shared across all windows of the same origin, unlike sessionStorage)
 * 4. onHandoffComplete is called, which signals the opener with 'auth-complete'
 * 5. Opener closes the popup and navigates the main window to the project domain
 * 6. The main window reads and removes the handoff from localStorage on startup
 *
 * This class is only used within popup windows, not in the main window.
 */
export class AuthDomainPopup {
  static browserInterface = {
    addEventListener: (
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => window.addEventListener(type, listener),
    getProtocol: () => window.location.protocol,
    getOpener: () => window.opener,
  }

  /**
   * Checks if the current window is a popup window
   */
  static isPopupWindow = () => {
    return window.opener !== null && window.opener !== undefined
  }

  /**
   * Reads authentication message from the opener window via postMessage.
   * Writes the auth payload to a localStorage handoff key so the main window
   * can pick it up after navigating to the same origin.
   * Calls onHandoffComplete once the handoff is written.
   */
  static readAuthMessage = (
    onHandoffComplete: () => void,
    authDomain: string,
  ) => {
    const authOrigin = `${this.browserInterface.getProtocol()}//${authDomain}`
    const opener = this.browserInterface.getOpener()

    // @ts-expect-error Argument of type '(event: MessageEvent) => void' is not
    // assignable to parameter of type 'EventListenerOrEventListenerObject'.
    this.browserInterface.addEventListener('message', (event: MessageEvent) => {
      const fromAuthOrigin = event.origin === authOrigin
      // event.source reliably identifies the sending window even cross-origin,
      // and can't be spoofed by other windows - covers the reverse flow (project
      // domain opener) where authOrigin (account domain) won't match event.origin.
      const fromOpener =
        opener != null && (event.source as Window | null) === opener
      if (!fromAuthOrigin && !fromOpener) {
        if (event.origin !== window.location.origin) {
          console.warn('Message received from untrusted origin:', event.origin)
        }
        return
      }
      const payload = event.data as AuthHandoffPayload
      localStorage.setItem(
        KEY_STORAGE_AUTH_HANDOFF,
        JSON.stringify({ auth: payload.auth, rememberMe: payload.rememberMe }),
      )
      onHandoffComplete()
    })

    // Signal to the opener that the popup is ready to receive auth data.
    // '*' is used since this carries no payload, and in the reverse flow
    // (project domain opener, account domain popup) authOrigin != opener's origin.
    if (opener) {
      opener.postMessage('popup-ready', '*')
    }
  }

  /**
   * Signals 'auth-complete' to the opener window. '*' is used as targetOrigin
   * since this message carries no payload (just a string signal) - the receiving
   * side (pollForAuthenticationComplete) independently validates event.origin
   * against the expected target URL's origin.
   */
  static signalAuthComplete = (): void => {
    const opener = this.browserInterface.getOpener()
    if (opener) {
      opener.postMessage('auth-complete', '*')
    }
  }
}
