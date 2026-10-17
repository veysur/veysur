import {
  START_TIMEOUT_MS,
  readBrowserHints,
  resolveMapStart,
} from './resolveMapStart'
import type { MapProvider } from './MapProvider'

const provider = (): jest.Mocked<MapProvider> => ({
  name: 'osm',
  createMap: jest.fn(),
  search: jest.fn().mockResolvedValue([]),
  reverse: jest.fn(),
})

const place = (lat: number, lng: number) => ({ lat, lng, address: 'x' })

const base = {
  options: {},
  hasAnswer: false,
  hints: { languages: ['en-GB', 'en'], timeZone: 'Europe/London' },
}

describe('resolveMapStart', () => {
  afterEach(() => jest.useRealTimers())

  it('uses the author centre without any lookup', async () => {
    const geocoder = provider()

    const view = await resolveMapStart({
      ...base,
      options: { centerLat: 10, centerLng: 20, zoom: 6 },
      provider: geocoder,
    })

    expect(view).toEqual({ lat: 10, lng: 20, zoom: 6 })
    expect(geocoder.search).not.toHaveBeenCalled()
  })

  it('opens on the time zone city within the language country', async () => {
    const geocoder = provider()
    geocoder.search.mockResolvedValueOnce([place(51.5, -0.12)])

    const view = await resolveMapStart({ ...base, provider: geocoder })

    expect(geocoder.search).toHaveBeenCalledWith('London, United Kingdom', [
      'GB',
    ])
    expect(view).toEqual({ lat: 51.5, lng: -0.12, zoom: 10 })
  })

  it('falls back to the country when the city is not found', async () => {
    const geocoder = provider()
    geocoder.search
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([place(54, -2)])

    const view = await resolveMapStart({ ...base, provider: geocoder })

    expect(geocoder.search).toHaveBeenLastCalledWith('United Kingdom', ['GB'])
    expect(view).toEqual({ lat: 54, lng: -2, zoom: 5 })
  })

  it('uses the country alone when the time zone has no city', async () => {
    const geocoder = provider()
    geocoder.search.mockResolvedValueOnce([place(54, -2)])

    const view = await resolveMapStart({
      ...base,
      hints: { languages: ['en-GB'], timeZone: 'UTC' },
      provider: geocoder,
    })

    expect(geocoder.search).toHaveBeenCalledTimes(1)
    expect(view.zoom).toBe(5)
  })

  it('skips a language with no region and uses the next that has one', async () => {
    const geocoder = provider()
    geocoder.search.mockResolvedValue([place(46, 2)])

    await resolveMapStart({
      ...base,
      hints: { languages: ['fr', 'fr-FR'], timeZone: undefined },
      provider: geocoder,
    })

    expect(geocoder.search).toHaveBeenCalledWith('France', ['FR'])
  })

  it('opens on the world when the browser gives no region', async () => {
    const geocoder = provider()

    const view = await resolveMapStart({
      ...base,
      hints: { languages: ['en'], timeZone: 'Europe/London' },
      provider: geocoder,
    })

    expect(geocoder.search).not.toHaveBeenCalled()
    expect(view).toEqual({ lat: 20, lng: 0, zoom: 3 })
  })

  it('ignores an author zoom when there is no author centre', async () => {
    const geocoder = provider()
    geocoder.search.mockResolvedValueOnce([place(51.5, -0.12)])

    const view = await resolveMapStart({
      ...base,
      options: { zoom: 8 },
      provider: geocoder,
    })

    expect(view.zoom).toBe(10)
  })

  it('does nothing for a participant who already answered', async () => {
    const geocoder = provider()

    await resolveMapStart({ ...base, hasAnswer: true, provider: geocoder })

    expect(geocoder.search).not.toHaveBeenCalled()
  })

  it('opens on the world when the geocoder fails', async () => {
    const geocoder = provider()
    geocoder.search.mockRejectedValue(new Error('offline'))

    expect(await resolveMapStart({ ...base, provider: geocoder })).toEqual({
      lat: 20,
      lng: 0,
      zoom: 3,
    })
  })

  it('gives up waiting for a slow geocoder', async () => {
    jest.useFakeTimers()
    const geocoder = provider()
    geocoder.search.mockReturnValue(new Promise(() => undefined))

    const pending = resolveMapStart({ ...base, provider: geocoder })
    await jest.advanceTimersByTimeAsync(START_TIMEOUT_MS * 2 + 1)

    expect(await pending).toEqual({ lat: 20, lng: 0, zoom: 3 })
  })
})

describe('device position', () => {
  it('opens at street level on a device position the browser allows', async () => {
    const geocoder = provider()

    const view = await resolveMapStart({
      ...base,
      provider: geocoder,
      devicePosition: async () => ({ lat: 51.5, lng: -0.12 }),
    })

    expect(view).toEqual({ lat: 51.5, lng: -0.12, zoom: 17 })
    expect(geocoder.search).not.toHaveBeenCalled()
  })

  it('ignores an author zoom when there is no author centre', async () => {
    const view = await resolveMapStart({
      ...base,
      options: { zoom: 12 },
      provider: provider(),
      devicePosition: async () => ({ lat: 51.5, lng: -0.12 }),
    })

    expect(view.zoom).toBe(17)
  })

  it('falls back to the browser place when there is no device position', async () => {
    const geocoder = provider()
    geocoder.search.mockResolvedValueOnce([place(51.5, -0.12)])

    const view = await resolveMapStart({
      ...base,
      provider: geocoder,
      devicePosition: async () => null,
    })

    expect(view.zoom).toBe(10)
  })
})

describe('readBrowserHints', () => {
  it('reads languages and the time zone from the browser', () => {
    const hints = readBrowserHints()

    expect(Array.isArray(hints.languages)).toBe(true)
    expect(typeof hints.timeZone).toBe('string')
  })
})
