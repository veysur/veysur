/**
 * Example configurations for BrowserPersister defaults
 *
 * These examples show different ways to configure the default persistence behavior
 * for all queries in your application.
 */

import { BrowserPersister } from './BrowserPersister'

// ============================================================================
// Example 1: Default Configuration (Backward Compatible)
// ============================================================================
// All queries persist to localStorage by default
// Queries can opt-out by setting meta.persistence.enabled = false
// Queries can use sessionStorage by setting meta.persistence.storageType = 'session'

const persisterDefault = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'local',
    storageKey: 'REACT_QUERY_OFFLINE_CACHE',
  },
)

// ============================================================================
// Example 2: Opt-In Persistence
// ============================================================================
// Queries don't persist by default
// Queries must explicitly opt-in by setting meta.persistence.enabled = true
// Good for apps where most data is temporary/real-time

const persisterOptIn = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: false, // Disabled by default
    storageType: 'local', // When enabled, use localStorage
  },
)

// Usage with opt-in:
// useQuery({
//   queryKey: ['importantData'],
//   queryFn: fetchData,
//   meta: {
//     persistence: {
//       enabled: true, // Must opt-in
//     }
//   }
// })

// ============================================================================
// Example 3: Session-First Strategy
// ============================================================================
// All queries persist to sessionStorage by default
// Good for apps with sensitive data that shouldn't persist across sessions
// Queries can opt-in to localStorage if needed

const persisterSessionFirst = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'session', // Session storage by default
  },
)

// Usage with session-first:
// useQuery({
//   queryKey: ['userPrefs'],
//   queryFn: fetchPrefs,
//   meta: {
//     persistence: {
//       storageType: 'local', // Override to use localStorage
//     }
//   }
// })

// ============================================================================
// Example 4: No Defaults (Explicit Configuration Required)
// ============================================================================
// Queries must explicitly specify their persistence behavior
// Most strict approach - prevents accidental persistence

const persisterExplicit = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: false,
    storageType: 'local',
  },
)

// With this config, every query needs explicit persistence config:
// useQuery({
//   queryKey: ['data'],
//   queryFn: fetchData,
//   meta: {
//     persistence: {
//       enabled: true,
//       storageType: 'local',
//     }
//   }
// })

// ============================================================================
// Real-World Scenarios
// ============================================================================

/**
 * Scenario 1: E-Commerce Application
 * - Most data (products, categories) should be cached long-term
 * - Shopping cart should only persist during session
 * - Search results shouldn't persist
 */
const persisterEcommerce = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'local', // Product data persists across sessions
  },
)
// Then override specific queries:
// - Cart: meta.persistence.storageType = 'session'
// - Search: meta.persistence.enabled = false

/**
 * Scenario 2: Admin Dashboard
 * - User auth and settings persist long-term
 * - Most data should be fresh (analytics, reports)
 * - Current filters/state persist during session
 */
const persisterDashboard = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: false, // Most data should be fresh
    storageType: 'session', // When persisted, use session
  },
)
// Then override specific queries:
// - Auth: meta.persistence.enabled = true, storageType = 'local'
// - Settings: meta.persistence.enabled = true, storageType = 'local'
// - Filters: meta.persistence.enabled = true (uses session default)

/**
 * Scenario 3: Survey Application
 * - Public surveys: No persistence (privacy)
 * - Admin: Persist to localStorage
 * - Active responses: Persist to sessionStorage
 */
const persisterSurveyPublic = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: false, // Don't persist survey responses by default
    storageType: 'session',
  },
)

const persisterSurveyAdmin = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true, // Admin data persists by default
    storageType: 'local',
  },
)

/**
 * Scenario 4: Multi-tenant Application
 * - Different storage keys for different tenants/environments
 * - Prevents cache conflicts on shared domains
 */
const persisterTenantA = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'local',
    storageKey: 'TENANT_A_QUERY_CACHE', // Unique key per tenant
  },
)

const persisterTenantB = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'local',
    storageKey: 'TENANT_B_QUERY_CACHE', // Different key
  },
)

/**
 * Scenario 5: Versioned Cache
 * - Use versioned keys to force cache invalidation after updates
 * - Useful when query structures change
 */
const persisterVersioned = new BrowserPersister(
  window.localStorage,
  window.sessionStorage,
  {
    enabled: true,
    storageType: 'local',
    storageKey: 'QUERY_CACHE_V2', // Increment version on breaking changes
  },
)

/**
 * Scenario 6: Environment-Specific Keys
 * - Different keys for dev/stage/production
 * - Prevents cache pollution when testing
 */
const getEnvironmentPersister = () => {
  const env = process.env.NODE_ENV || 'development'
  return new BrowserPersister(window.localStorage, window.sessionStorage, {
    enabled: true,
    storageType: 'local',
    storageKey: `QUERY_CACHE_${env.toUpperCase()}`,
  })
}

export {
  persisterDefault,
  persisterOptIn,
  persisterSessionFirst,
  persisterExplicit,
  persisterEcommerce,
  persisterDashboard,
  persisterSurveyPublic,
  persisterSurveyAdmin,
  persisterTenantA,
  persisterTenantB,
  persisterVersioned,
  getEnvironmentPersister,
}
