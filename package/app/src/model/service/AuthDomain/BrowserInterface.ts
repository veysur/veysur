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
  openWindow: (url: string, target: string) => window.open(url, target),
  closeWindow: () => window.close(),
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => window.addEventListener(type, listener),
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => window.removeEventListener(type, listener),
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
