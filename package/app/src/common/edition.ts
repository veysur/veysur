/**
 * Deployment edition (frontend).
 *
 * Mirrors `package/api/src/config/edition.ts`. The value is baked at build time
 * by rsbuild `source.define` from `PUBLIC_EDITION`. Anything other than the exact
 * string `self-hosted` (including unset) resolves to `cloud`, so the commercial
 * edition's behaviour never changes without an explicit opt-in.
 *
 * Branch-free for now (WS1); later workstreams add the `isSelfHosted()` /
 * `isCloud()` call sites. Never imported by `veysur-common`.
 */

export type Edition = 'self-hosted' | 'cloud'

export function getEdition(): Edition {
  return process.env.PUBLIC_EDITION === 'self-hosted' ? 'self-hosted' : 'cloud'
}

export function isSelfHosted(): boolean {
  return getEdition() === 'self-hosted'
}

export function isCloud(): boolean {
  return !isSelfHosted()
}
