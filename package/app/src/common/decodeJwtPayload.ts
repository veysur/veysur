/**
 * Decodes a JWT payload without verifying its signature — for reading claims
 * client-side only (e.g. cache keys). The server remains the source of truth
 * for authorisation; never trust this for anything security-sensitive.
 */
export function decodeJwtPayload<T = unknown>(token: string): T | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    )

    return JSON.parse(atob(padded)) as T
  } catch {
    return null
  }
}
