import { AuthDomainUIInterface } from './types'

/**
 * AuthDomainUI
 *
 * Handles visual feedback for cross-domain authentication - the full-page
 * overlay shown while a handoff token is minted and the browser redirects.
 */
export class AuthDomainUI implements AuthDomainUIInterface {
  /**
   * Shows a full-page loading overlay to cover the async mint request and
   * the redirect that follows it. Uses theme detection to prevent white
   * flash in dark mode.
   */
  showRedirectOverlay = (): void => {
    // Create overlay container
    const overlay = document.createElement('div')
    overlay.id = 'auth-redirect-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: Arial, sans-serif;
    `

    // Detect theme (same pattern as injectThemeScript)
    const match = document.cookie.match(/(?:^|;\s*)veysur-theme=([^;]+)/)
    let theme: string | null = match ? match[1] : null

    if (!theme || theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }

    const isDark = theme === 'dark'
    overlay.style.backgroundColor = isDark ? '#0a0a0a' : '#ffffff'
    overlay.style.color = isDark ? '#ffffff' : '#000000'

    // Create spinner
    const spinner = document.createElement('div')
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 3px solid ${isDark ? '#333333' : '#e5e5e5'};
      border-top-color: ${isDark ? '#ffffff' : '#000000'};
      border-radius: 50%;
      animation: auth-redirect-spin 1s linear infinite;
      margin-bottom: 16px;
    `

    // Add keyframes for spinner animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes auth-redirect-spin {
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)

    // Create message
    const message = document.createElement('p')
    message.textContent = 'Redirecting'
    message.style.cssText = `
      margin: 0;
      font-size: 16px;
      opacity: 0.8;
    `

    const topSpacer = document.createElement('div')
    topSpacer.style.flex = '1'
    overlay.appendChild(topSpacer)

    const content = document.createElement('div')
    content.style.display = 'flex'
    content.style.flexDirection = 'column'
    content.style.alignItems = 'center'
    content.appendChild(spinner)
    content.appendChild(message)
    overlay.appendChild(content)

    const bottomSpacer = document.createElement('div')
    bottomSpacer.style.flex = '1.618'
    overlay.appendChild(bottomSpacer)

    document.body.appendChild(overlay)
  }
}
