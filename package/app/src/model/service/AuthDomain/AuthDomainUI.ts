import { AuthDomainUIInterface } from './types'

/**
 * AuthDomainUI
 *
 * Handles visual feedback and styling for cross-domain authentication.
 * Manages overlay rendering and popup window styling with theme support.
 */
export class AuthDomainUI implements AuthDomainUIInterface {
  /**
   * Injects theme detection script to prevent white flash in dark mode.
   * This matches the script in index.html.
   */
  injectThemeScript = (doc: Document): void => {
    const script = doc.createElement('script')
    script.textContent = `
      (function() {
        const match = document.cookie.match(/(?:^|;\\s*)veysur-theme=([^;]+)/);
        let theme = match ? match[1] : null;

        if (!theme || theme === 'system') {
          theme = 'light';
        }

        if (theme === 'dark' || theme === 'light') {
          document.documentElement.classList.add(theme);
          document.documentElement.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#ffffff';
        }
      })();
    `
    doc.head.appendChild(script)
  }

  /**
   * Applies loading styles to a popup window document
   */
  applyPopupStyles = (doc: Document): void => {
    doc.title = 'Authenticating'

    const body = doc.body
    if (body) {
      body.style.fontFamily = 'Arial, sans-serif'
      body.style.padding = '0'
      body.style.margin = '0'
      body.style.minHeight = '100vh'
      body.style.display = 'flex'
      body.style.flexDirection = 'column'
      body.style.alignItems = 'center'

      const topSpacer = doc.createElement('div')
      topSpacer.style.flex = '1'
      body.appendChild(topSpacer)

      const content = doc.createElement('div')
      content.style.display = 'flex'
      content.style.flexDirection = 'column'
      content.style.alignItems = 'center'

      const heading = doc.createElement('h2')
      heading.textContent = 'Authenticating'
      content.appendChild(heading)

      const paragraph = doc.createElement('p')
      paragraph.textContent = 'Please wait while we complete your login.'
      content.appendChild(paragraph)

      body.appendChild(content)

      const bottomSpacer = doc.createElement('div')
      bottomSpacer.style.flex = '1.618'
      body.appendChild(bottomSpacer)
    }
  }

  /**
   * Shows a full-page loading overlay before redirect to prevent flash of current page content.
   * Uses theme detection to prevent white flash in dark mode.
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
