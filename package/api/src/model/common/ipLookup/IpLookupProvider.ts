import type { IpLocation } from './IpLocation'

export type { IpLocation }

export interface IpLookupProvider {
  readonly providerName: string
  lookup(ip: string): Promise<IpLocation | null>
}

/**
 * Returns false for loopback, private, and link-local addresses —
 * avoiding unnecessary outbound requests for IPs that cannot be geolocated.
 */
export function isPublicIp(ip: string): boolean {
  if (!ip) return false

  // Unwrap IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  const resolved = ipv4Mapped ? ipv4Mapped[1] : ip

  const ipv4 = resolved.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (ipv4) {
    const a = Number(ipv4[1])
    const b = Number(ipv4[2])
    if (a === 0) return false // 0.0.0.0/8
    if (a === 10) return false // 10.0.0.0/8
    if (a === 127) return false // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return false // 169.254.0.0/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return false // 172.16.0.0/12
    if (a === 192 && b === 168) return false // 192.168.0.0/16
    return true
  }

  // IPv6
  const lower = resolved.toLowerCase()
  if (lower === '::1') return false // loopback
  if (/^fe[89ab]/i.test(lower)) return false // fe80::/10 link-local
  if (/^f[cd]/i.test(lower)) return false // fc00::/7 unique local

  return resolved.includes(':') // treat remaining IPv6 as public
}
