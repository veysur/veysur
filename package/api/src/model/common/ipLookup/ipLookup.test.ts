import { isPublicIp } from './IpLookupProvider'
import { IpApiProvider } from './provider/IpApiProvider'
import { IpLookupService } from './IpLookupService'
import type { IpLocation } from './IpLocation'
import type { IpLookupProvider } from './IpLookupProvider'

// ---------------------------------------------------------------------------
// isPublicIp
// ---------------------------------------------------------------------------

describe('isPublicIp', () => {
  describe('private IPv4 ranges', () => {
    it.each([
      ['0.0.0.0', '0.0.0.0/8'],
      ['0.255.255.255', '0.0.0.0/8 upper'],
      ['10.0.0.1', '10.0.0.0/8'],
      ['10.255.255.255', '10.0.0.0/8 upper'],
      ['127.0.0.1', 'loopback'],
      ['127.255.255.255', 'loopback upper'],
      ['169.254.0.1', 'link-local'],
      ['169.254.255.255', 'link-local upper'],
      ['172.16.0.1', '172.16.0.0/12'],
      ['172.31.255.255', '172.16.0.0/12 upper'],
      ['192.168.0.1', '192.168.0.0/16'],
      ['192.168.255.255', '192.168.0.0/16 upper'],
    ])('%s (%s) → false', (ip) => {
      expect(isPublicIp(ip)).toBe(false)
    })
  })

  describe('public IPv4 addresses', () => {
    it.each([
      ['8.8.8.8'],
      ['1.1.1.1'],
      ['203.0.113.5'],
      ['172.15.255.255'],
      ['172.32.0.0'],
    ])('%s → true', (ip) => {
      expect(isPublicIp(ip)).toBe(true)
    })
  })

  describe('private IPv6', () => {
    it.each([
      ['::1', 'loopback'],
      ['fe80::1', 'link-local'],
      ['fe8f::1', 'link-local variant'],
      ['fc00::1', 'unique local fc'],
      ['fd00::1', 'unique local fd'],
    ])('%s (%s) → false', (ip) => {
      expect(isPublicIp(ip)).toBe(false)
    })
  })

  describe('public IPv6', () => {
    it.each([['2001:db8::1'], ['2606:4700:4700::1111']])('%s → true', (ip) => {
      expect(isPublicIp(ip)).toBe(true)
    })
  })

  describe('IPv4-mapped IPv6', () => {
    it('::ffff:192.168.1.1 → false (private)', () => {
      expect(isPublicIp('::ffff:192.168.1.1')).toBe(false)
    })

    it('::ffff:8.8.8.8 → true (public)', () => {
      expect(isPublicIp('::ffff:8.8.8.8')).toBe(true)
    })
  })

  it('empty string → false', () => {
    expect(isPublicIp('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// IpApiProvider
// ---------------------------------------------------------------------------

describe('IpApiProvider', () => {
  let provider: IpApiProvider
  let fetchMock: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    provider = new IpApiProvider()
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('has providerName "ip-api"', () => {
    expect(provider.providerName).toBe('ip-api')
  })

  it('maps ip-api.com response fields to IpLocation', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        status: 'success',
        country: 'United Kingdom',
        countryCode: 'GB',
        regionName: 'England',
        region: 'ENG',
        city: 'London',
        lat: 51.5074,
        lon: -0.1278,
        timezone: 'Europe/London',
      }),
    } as Response)

    const result = await provider.lookup('1.2.3.4')

    expect(result).toEqual({
      country: 'United Kingdom',
      countryCode: 'GB',
      region: 'England', // from regionName
      regionCode: 'ENG', // from region
      city: 'London',
      lat: 51.5074,
      lon: -0.1278,
      timezone: 'Europe/London',
    })
  })

  it('returns null when status is not "success"', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ status: 'fail', message: 'private range' }),
    } as Response)

    expect(await provider.lookup('1.2.3.4')).toBeNull()
  })

  it('propagates network errors without swallowing them', async () => {
    fetchMock.mockRejectedValue(new Error('network failure'))

    await expect(provider.lookup('1.2.3.4')).rejects.toThrow('network failure')
  })

  it('includes the correct query fields in the URL', async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ status: 'fail' }),
    } as Response)

    await provider.lookup('8.8.8.8')

    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('8.8.8.8')
    expect(url).toContain('fields=')
    expect(url).toContain('countryCode')
    expect(url).toContain('timezone')
  })
})

// ---------------------------------------------------------------------------
// IpLookupService
// ---------------------------------------------------------------------------

describe('IpLookupService', () => {
  const mockLocation: IpLocation = {
    country: 'Germany',
    countryCode: 'DE',
    region: 'Bavaria',
    regionCode: 'BY',
    city: 'Munich',
    lat: 48.1351,
    lon: 11.582,
    timezone: 'Europe/Berlin',
  }

  function makeProvider(
    result: IpLocation | null = mockLocation,
  ): IpLookupProvider {
    return {
      providerName: 'mock',
      lookup: jest.fn().mockResolvedValue(result),
    }
  }

  it('returns null for a private IP without calling the provider', async () => {
    const provider = makeProvider()
    const service = new IpLookupService(provider)

    const result = await service.lookupIp('192.168.1.1')

    expect(result).toBeNull()
    expect(provider.lookup).not.toHaveBeenCalled()
  })

  it('delegates to the provider for a public IP', async () => {
    const provider = makeProvider(mockLocation)
    const service = new IpLookupService(provider)

    const result = await service.lookupIp('8.8.8.8')

    expect(provider.lookup).toHaveBeenCalledWith('8.8.8.8')
    expect(result).toEqual(mockLocation)
  })

  it('returns null when the provider returns null', async () => {
    const provider = makeProvider(null)
    const service = new IpLookupService(provider)

    expect(await service.lookupIp('8.8.8.8')).toBeNull()
  })

  it('returns null for an empty IP string', async () => {
    const provider = makeProvider()
    const service = new IpLookupService(provider)

    expect(await service.lookupIp('')).toBeNull()
    expect(provider.lookup).not.toHaveBeenCalled()
  })
})
