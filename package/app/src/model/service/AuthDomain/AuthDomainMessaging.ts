import { AuthData } from 'hook'

import { KEY_STATE_REMEMBER_ME } from 'common/keyState'
import { queryClient } from 'common/queryClient'
import {
  BrowserInterface,
  AuthDomainUIInterface,
  AuthDomainWindowInterface,
  AuthDomainMessagingInterface,
} from './types'

const POLL_INTERVAL_MS = 100
const POLL_TARGET_WINDOW_READY_MAX_ATTEMPTS = 100 // Maximum 10 seconds (100 * POLL_INTERVAL_MS)
const POLL_AUTHENTICATION_COMPLETE_MAX_ATTEMPTS = 50 // Maximum 5 seconds (50 * POLL_INTERVAL_MS)
const FOCUS_FALLBACK_MIN_ATTEMPTS = 5

/**
 * AuthDomainMessaging
 *
 * Handles postMessage protocol for cross-domain authentication.
 * Listens for popup readiness and completion messages, with polling as a fallback.
 */
export class AuthDomainMessaging implements AuthDomainMessagingInterface {
  constructor(
    private browserInterface: BrowserInterface,
    private windowService: AuthDomainWindowInterface,
    private ui: AuthDomainUIInterface,
  ) {}

  /**
   * Waits for the target window to signal readiness via postMessage,
   * then posts auth data and begins listening for completion.
   * Falls back to proceeding after a timeout if no message is received.
   *
   * Also fires immediately when the main window regains focus — the opener is
   * backgrounded while the popup is visible, so browser timer throttling
   * (≥1 s per tick) can delay the polling fallback by minutes. The focus
   * listener bypasses this without touching the happy-path event flow.
   */
  pollTargetWindowReady = (
    url: string,
    authData?: AuthData,
    onSettled?: () => void,
  ): void => {
    const maxAttempts = POLL_TARGET_WINDOW_READY_MAX_ATTEMPTS
    let attempts = 0
    let handled = false
    const targetOrigin = new URL(url).origin

    const cleanup = () => {
      this.browserInterface.removeEventListener(
        'message',
        handlePopupReadyMessage,
      )
      this.browserInterface.removeEventListener('focus', handleFocus)
    }

    const proceed = () => {
      if (handled) return
      handled = true
      cleanup()
      const targetWindow = this.windowService.getTargetWindow()
      if (targetWindow && !targetWindow.closed) {
        const rememberMe =
          queryClient.getQueryData<boolean>([KEY_STATE_REMEMBER_ME]) ?? false
        targetWindow.postMessage({ auth: authData, rememberMe }, url)
        this.pollForAuthenticationComplete(url, onSettled)
      } else {
        onSettled?.()
      }
    }

    const handlePopupReadyMessage = (event: Event) => {
      const messageEvent = event as MessageEvent
      if (
        messageEvent.origin === targetOrigin &&
        messageEvent.data === 'popup-ready'
      ) {
        // Act immediately on message receipt — no poll cycle wait
        proceed()
      }
    }

    // Fire immediately when the user focuses the main window. This fires when
    // the popup is dismissed or the user switches back, bypassing throttled
    // timers in the background tab. Only fires after a short initial delay so
    // the popup has had time to load and attempt the event-based path first.
    const handleFocus = () => {
      if (attempts >= FOCUS_FALLBACK_MIN_ATTEMPTS) {
        proceed()
      }
    }

    this.browserInterface.addEventListener('message', handlePopupReadyMessage)
    this.browserInterface.addEventListener('focus', handleFocus)

    const poll = () => {
      if (handled) return
      attempts++

      const targetWindow = this.windowService.getTargetWindow()
      if (!targetWindow || targetWindow.closed) {
        cleanup()
        onSettled?.()
        return
      }

      if (attempts < maxAttempts) {
        setTimeout(poll, POLL_INTERVAL_MS)
      } else {
        // Fallback: proceed anyway after timeout
        proceed()
      }
    }

    poll()
  }

  /**
   * Listens for an authentication completion message from the popup,
   * then closes the popup and redirects to the target URL.
   * Falls back to closing and redirecting after a timeout if no message is received.
   */
  pollForAuthenticationComplete = (
    url: string,
    onSettled?: () => void,
  ): void => {
    const maxAttempts = POLL_AUTHENTICATION_COMPLETE_MAX_ATTEMPTS
    let attempts = 0
    let handled = false
    const targetOrigin = new URL(url).origin

    const finish = () => {
      if (handled) return
      handled = true
      this.browserInterface.removeEventListener(
        'message',
        handleAuthCompleteMessage,
      )
      // Close popup first, then defer the redirect to allow the browser to
      // process the close before the main window navigates away
      const currentTarget = this.windowService.getTargetWindow()
      if (currentTarget && !currentTarget.closed) {
        currentTarget.close()
      }
      this.windowService.setTargetWindow(null)
      setTimeout(() => {
        // Show overlay before redirect to prevent flash
        this.ui.showRedirectOverlay()
        this.browserInterface.setLocation(url)
        onSettled?.()
      }, 0)
    }

    const handleAuthCompleteMessage = (event: Event) => {
      const messageEvent = event as MessageEvent
      if (
        messageEvent.origin === targetOrigin &&
        messageEvent.data === 'auth-complete'
      ) {
        // Act immediately on message receipt — no poll cycle wait
        finish()
      }
    }

    this.browserInterface.addEventListener('message', handleAuthCompleteMessage)

    const poll = () => {
      if (handled) return
      attempts++

      const targetWindow = this.windowService.getTargetWindow()
      if (!targetWindow || targetWindow.closed) {
        // Popup closed without sending auth-complete — finish anyway so the
        // main window still navigates to the target URL.
        finish()
        return
      }

      // Fallback: proceed after maximum attempts
      if (attempts >= maxAttempts) {
        finish()
        return
      }

      // Continue polling only for fallback / window-closed detection
      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()
  }
}
