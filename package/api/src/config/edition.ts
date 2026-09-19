/**
 * Deployment edition.
 *
 * One `self-hosted | cloud` concept, read from `DEPLOYMENT_MODE`. Anything other
 * than the exact string `self-hosted` (including unset) resolves to `cloud`, so
 * the commercial edition's behaviour never changes without an explicit opt-in.
 *
 * This module is intentionally branch-free. Later workstreams add the actual
 * `isSelfHosted()` / `isCloud()` call sites; adding one here would be dead code.
 *
 * Read only by `package/api` (runtime config) and `package/app` (rsbuild
 * `define`) — never by `veysur-common`.
 */

export type Edition = 'self-hosted' | 'cloud'

export function getEdition(): Edition {
  return process.env.DEPLOYMENT_MODE === 'self-hosted' ? 'self-hosted' : 'cloud'
}

export function isSelfHosted(): boolean {
  return getEdition() === 'self-hosted'
}

export function isCloud(): boolean {
  return getEdition() === 'cloud'
}
