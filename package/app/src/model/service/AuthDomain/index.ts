// Main facade (backward compatible)
export * from './AuthDomain'
export * from './AuthDomainPopup'

// Types for dependency injection
export * from './types'

// Browser interface for testing
export {
  createBrowserInterface,
  defaultBrowserInterface,
} from './BrowserInterface'

// Sub-services (for advanced use cases)
export { AuthDomainConfig } from './AuthDomainConfig'
export { AuthDomainValidator } from './AuthDomainValidator'
export { AuthDomainUI } from './AuthDomainUI'
export { AuthDomainWindow } from './AuthDomainWindow'
export { AuthDomainMessaging } from './AuthDomainMessaging'
export { AuthDomainNavigation } from './AuthDomainNavigation'
