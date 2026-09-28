// Main facade (backward compatible)
export * from './AuthDomain'

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
export { AuthDomainNavigation } from './AuthDomainNavigation'
