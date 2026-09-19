import * as ipaddr from 'ipaddr.js'

// '8.8.8.8' → 134744072
export function ipv4ToInt(ip: string): number {
  const bytes = (ipaddr.parse(ip) as ipaddr.IPv4).toByteArray()
  return (
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  )
}

// '2001:4860::8888' → '20014860000000000000000000008888' (32-char lowercase hex)
export function ipv6ToHex(ip: string): string {
  const bytes = (ipaddr.parse(ip) as ipaddr.IPv6).toByteArray()
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Unwraps ::ffff:x.x.x.x → IPv4; returns normalised IP string and version
export function normalizeIp(ip: string): { ip: string; version: 4 | 6 } {
  if (!ip) return { ip, version: 4 }
  try {
    const parsed = ipaddr.parse(ip)
    if (parsed.kind() === 'ipv6') {
      const v6 = parsed as ipaddr.IPv6
      if (v6.isIPv4MappedAddress()) {
        const v4 = v6.toIPv4Address()
        return { ip: v4.toString(), version: 4 }
      }
      return { ip: parsed.toString(), version: 6 }
    }
    return { ip: parsed.toString(), version: 4 }
  } catch {
    return { ip, version: 4 }
  }
}

// Zeroes the host portion of an IP for privacy-preserving storage:
// IPv4 → last octet (/24), IPv6 → last 80 bits (/48)
export function truncateIp(ip: string): string {
  const { ip: normalized, version } = normalizeIp(ip)
  try {
    const parsed = ipaddr.parse(normalized)
    const bytes = parsed.toByteArray()
    const zeroFromByte = version === 4 ? 3 : 6
    for (let i = zeroFromByte; i < bytes.length; i++) bytes[i] = 0
    return ipaddr.fromByteArray(bytes).toString()
  } catch {
    return normalized
  }
}

export interface CidrRange {
  from: number | string
  to: number | string
  version: 4 | 6
}

// Expands a CIDR string to {from, to, version}
// IPv4: from/to are JS numbers (32-bit unsigned)
// IPv6: from/to are 32-char lowercase hex strings
export function cidrToRange(cidr: string): CidrRange {
  const [addr, prefix] = ipaddr.parseCIDR(cidr)

  if (addr.kind() === 'ipv4') {
    const bytes = (addr as ipaddr.IPv4).toByteArray()
    const addrInt =
      ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    const from = (addrInt & mask) >>> 0
    const to = (from | (~mask >>> 0)) >>> 0
    return { from, to, version: 4 }
  }

  // IPv6 — use BigInt for 128-bit arithmetic
  const bytes = (addr as ipaddr.IPv6).toByteArray()
  let addrBig = BigInt(0)
  for (const b of bytes) {
    addrBig = (addrBig << BigInt(8)) | BigInt(b)
  }

  const totalBits = BigInt(128)
  const mask =
    prefix === 0
      ? BigInt(0)
      : ((BigInt(1) << totalBits) - BigInt(1)) ^
        ((BigInt(1) << BigInt(128 - prefix)) - BigInt(1))

  const fromBig = addrBig & mask
  const toBig = fromBig | (~mask & ((BigInt(1) << totalBits) - BigInt(1)))

  return {
    from: bigIntToHex128(fromBig),
    to: bigIntToHex128(toBig),
    version: 6,
  }
}

function bigIntToHex128(n: bigint): string {
  return n.toString(16).padStart(32, '0')
}
