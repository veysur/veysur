import { BrowserInterface } from './types'

/**
 * Default browser interface implementation that wraps real browser APIs.
 * Can be replaced for testing via dependency injection.
 */
export const createBrowserInterface = (): BrowserInterface => ({
  getLocation: () => window.location,
  setLocation: (url: string) => {
    window.location.href = url
  },
  replaceHistoryState: (url: string) => {
    window.history.replaceState(null, '', url)
  },
  getProtocol: () => window.location.protocol,
  getOrigin: () => window.location.origin,
  getHost: () => window.location.host,
  getReferrer: () => document.referrer,
  reloadPage: () => location.reload(),
})

/**
 * Default browser interface instance
 */
export const defaultBrowserInterface = createBrowserInterface()
