// cspell:ignore Nominatim
import { OsmProvider } from './OsmProvider'

const fetchMock = jest.fn()

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
})

function respondWith(body: unknown, ok = true) {
  fetchMock.mockResolvedValue({
    ok,
    status: ok ? 200 : 503,
    json: async () => body,
  })
}

describe('OsmProvider', () => {
  it('searches Nominatim and maps results', async () => {
    respondWith([
      {
        lat: '51.5',
        lon: '-0.12',
        display_name: 'London, UK',
        address: { country_code: 'gb' },
      },
    ])

    const results = await new OsmProvider().search('London', ['GB', 'FR'])

    expect(results).toEqual([
      { lat: 51.5, lng: -0.12, address: 'London, UK', countryCode: 'GB' },
    ])
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/search')
    expect(url.searchParams.get('q')).toBe('London')
    expect(url.searchParams.get('countrycodes')).toBe('gb,fr')
  })

  it('does not restrict countries when none are listed', async () => {
    respondWith([])

    await new OsmProvider().search('London', [])

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.searchParams.has('countrycodes')).toBe(false)
  })

  it('reverse geocodes to an address and country', async () => {
    respondWith({
      display_name: 'Paris, France',
      address: { country_code: 'fr' },
    })

    const result = await new OsmProvider().reverse(48.85, 2.35)

    expect(result).toEqual({ address: 'Paris, France', countryCode: 'FR' })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/reverse')
    expect(url.searchParams.get('lat')).toBe('48.85')
    expect(url.searchParams.get('lon')).toBe('2.35')
  })

  it('rejects when the geocoder is unavailable', async () => {
    respondWith({}, false)

    await expect(new OsmProvider().search('x', [])).rejects.toThrow(
      'Geocoder returned 503',
    )
  })
})
