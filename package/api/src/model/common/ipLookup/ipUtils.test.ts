import {
  ipv4ToInt,
  ipv6ToHex,
  normalizeIp,
  cidrToRange,
  truncateIp,
} from './ipUtils'

// ---------------------------------------------------------------------------
// ipv4ToInt
// ---------------------------------------------------------------------------

describe('ipv4ToInt', () => {
  it.each([
    ['0.0.0.0', 0],
    ['0.0.0.1', 1],
    ['8.8.8.8', 134744072],
    ['1.0.0.0', 16777216],
    ['1.0.0.255', 16777471],
    ['255.255.255.255', 4294967295],
  ])('%s → %i', (ip, expected) => {
    expect(ipv4ToInt(ip)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// ipv6ToHex
// ---------------------------------------------------------------------------

describe('ipv6ToHex', () => {
  it('produces a 32-character string', () => {
    expect(ipv6ToHex('2001:4860:4860::8888')).toHaveLength(32)
  })

  it('is always lowercase', () => {
    const hex = ipv6ToHex('2001:4860:4860::8888')
    expect(hex).toBe(hex.toLowerCase())
  })

  it('zero-pads correctly for low addresses', () => {
    // ::1 loopback — 31 zeros + '1'
    expect(ipv6ToHex('::1')).toBe('00000000000000000000000000000001')
  })

  it('converts a known address correctly', () => {
    // 2001:4860:4860::8888
    expect(ipv6ToHex('2001:4860:4860::8888')).toBe(
      '20014860486000000000000000008888',
    )
  })

  it('handles all-max address', () => {
    expect(ipv6ToHex('ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(
      'ffffffffffffffffffffffffffffffff',
    )
  })
})

// ---------------------------------------------------------------------------
// normalizeIp
// ---------------------------------------------------------------------------

describe('normalizeIp', () => {
  it('returns IPv4 unchanged', () => {
    expect(normalizeIp('8.8.8.8')).toEqual({ ip: '8.8.8.8', version: 4 })
  })

  it('unwraps IPv4-mapped IPv6 ::ffff:x.x.x.x', () => {
    const result = normalizeIp('::ffff:8.8.8.8')
    expect(result.version).toBe(4)
    expect(result.ip).toBe('8.8.8.8')
  })

  it('returns IPv6 with version 6', () => {
    const result = normalizeIp('2001:4860:4860::8888')
    expect(result.version).toBe(6)
  })

  it('returns version 4 for empty string (safe fallback)', () => {
    expect(normalizeIp('')).toEqual({ ip: '', version: 4 })
  })
})

// ---------------------------------------------------------------------------
// truncateIp
// ---------------------------------------------------------------------------

describe('truncateIp', () => {
  it('zeroes the last octet of an IPv4 address', () => {
    expect(truncateIp('8.8.8.8')).toBe('8.8.8.0')
    expect(truncateIp('192.168.1.255')).toBe('192.168.1.0')
  })

  it('unwraps IPv4-mapped IPv6 before truncating', () => {
    expect(truncateIp('::ffff:8.8.8.8')).toBe('8.8.8.0')
  })

  it('zeroes the last 80 bits of an IPv6 address (keeps first 48 bits)', () => {
    expect(truncateIp('2001:4860:4860::8888')).toBe('2001:4860:4860::')
  })

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(truncateIp('not-an-ip')).toBe('not-an-ip')
  })
})

// ---------------------------------------------------------------------------
// cidrToRange
// ---------------------------------------------------------------------------

describe('cidrToRange', () => {
  describe('IPv4', () => {
    it('/32 single host: from === to', () => {
      const { from, to, version } = cidrToRange('8.8.8.8/32')
      expect(version).toBe(4)
      expect(from).toBe(134744072)
      expect(to).toBe(134744072)
    })

    it('/24 gives correct start and end', () => {
      const { from, to, version } = cidrToRange('1.0.0.0/24')
      expect(version).toBe(4)
      expect(from).toBe(ipv4ToInt('1.0.0.0'))
      expect(to).toBe(ipv4ToInt('1.0.0.255'))
    })

    it('/16 gives correct start and end', () => {
      const { from, to } = cidrToRange('192.168.0.0/16')
      expect(from).toBe(ipv4ToInt('192.168.0.0'))
      expect(to).toBe(ipv4ToInt('192.168.255.255'))
    })

    it('to is always >= from', () => {
      const { from, to } = cidrToRange('10.0.0.0/8')
      expect(to).toBeGreaterThanOrEqual(from as number)
    })

    it('/0 covers the full space', () => {
      const { from, to } = cidrToRange('0.0.0.0/0')
      expect(from).toBe(0)
      expect(to).toBe(4294967295)
    })
  })

  describe('IPv6', () => {
    it('/128 single host: from === to', () => {
      const { from, to, version } = cidrToRange('2001:4860:4860::8888/128')
      expect(version).toBe(6)
      expect(from).toBe(to)
      expect((from as string).length).toBe(32)
    })

    it('/32 gives correct start', () => {
      const { from, version } = cidrToRange('2001:200::/32')
      expect(version).toBe(6)
      expect(from).toBe('20010200000000000000000000000000')
    })

    it('to is always >= from (string comparison for equal-length hex)', () => {
      const { from, to } = cidrToRange('2001::/32')
      expect((to as string) >= (from as string)).toBe(true)
    })

    it('produces 32-char hex strings', () => {
      const { from, to } = cidrToRange('::1/128')
      expect((from as string).length).toBe(32)
      expect((to as string).length).toBe(32)
    })
  })
})
