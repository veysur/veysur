import { MapAuthError } from './MapProvider'
import { GoogleProvider } from './GoogleProvider'

type FakeResult = {
  formatted_address: string
  address_components: { types: string[]; short_name: string }[]
  geometry: { location: { lat: () => number; lng: () => number } }
}

const result = (address: string, country: string, lat: number): FakeResult => ({
  formatted_address: address,
  address_components: [{ types: ['country'], short_name: country }],
  geometry: { location: { lat: () => lat, lng: () => 0 } },
})

const geocode = jest.fn()

beforeEach(() => {
  geocode.mockReset()
  Object.defineProperty(window, 'google', {
    configurable: true,
    value: { maps: { Geocoder: jest.fn(() => ({ geocode })) } },
  })
})

afterEach(() => {
  Reflect.deleteProperty(window, 'google')
})

describe('GoogleProvider', () => {
  it('restricts a single country in the request', async () => {
    geocode.mockResolvedValue({ results: [result('London, UK', 'GB', 51.5)] })

    const found = await new GoogleProvider('k').search('London', ['GB'])

    expect(geocode).toHaveBeenCalledWith({
      address: 'London',
      componentRestrictions: { country: 'GB' },
    })
    expect(found).toEqual([
      { lat: 51.5, lng: 0, address: 'London, UK', countryCode: 'GB' },
    ])
  })

  it('filters results to the listed countries when there are several', async () => {
    geocode.mockResolvedValue({
      results: [
        result('Paris, France', 'FR', 48.8),
        result('Paris, Texas', 'US', 33.6),
      ],
    })

    const found = await new GoogleProvider('k').search('Paris', ['FR', 'GB'])

    expect(geocode.mock.calls[0][0].componentRestrictions).toBeUndefined()
    expect(found.map((item) => item.countryCode)).toEqual(['FR'])
  })

  it('returns everything when no country is listed', async () => {
    geocode.mockResolvedValue({
      results: [result('A', 'FR', 1), result('B', 'US', 2)],
    })

    expect(await new GoogleProvider('k').search('x', [])).toHaveLength(2)
  })

  it('reverse geocodes the first result', async () => {
    geocode.mockResolvedValue({
      results: [result('Paris, France', 'FR', 48.8)],
    })

    expect(await new GoogleProvider('k').reverse(48.8, 2.3)).toEqual({
      address: 'Paris, France',
      countryCode: 'FR',
    })
  })

  it('returns null when nothing is found', async () => {
    geocode.mockResolvedValue({ results: [] })

    expect(await new GoogleProvider('k').reverse(0, 0)).toBeNull()
  })
})

describe('GoogleProvider API key failures', () => {
  it('turns a denied geocode request into MapAuthError', async () => {
    geocode.mockRejectedValue(
      Object.assign(new Error('denied'), { code: 'REQUEST_DENIED' }),
    )

    await expect(new GoogleProvider('k').search('London', [])).rejects.toThrow(
      MapAuthError,
    )
  })

  it('passes other geocode errors through', async () => {
    geocode.mockRejectedValue(new Error('network'))

    await expect(
      new GoogleProvider('k').search('London', []),
    ).rejects.not.toBeInstanceOf(MapAuthError)
  })
})
