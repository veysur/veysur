import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SurveyQuestion, QUESTION_TYPE_MAP } from 'veysur-common'

import {
  MapConfigContext,
  MapConfigContextValue,
} from 'component/Survey/MapConfigContext'

import { QuestionTypeMap } from './QuestionTypeMap'
import type {
  MapProvider,
  MapViewHandle,
  MapViewOptions,
} from './map/MapProvider'
import { loadMapProvider } from './map/loadMapProvider'

jest.mock('./map/loadMapProvider', () => ({ loadMapProvider: jest.fn() }))

jest.mock('./map/resolveMapStart', () => ({
  ...jest.requireActual('./map/resolveMapStart'),
  readBrowserHints: () => ({ languages: ['en-GB'], timeZone: 'Europe/London' }),
}))

const mockLoadMapProvider = loadMapProvider as jest.MockedFunction<
  typeof loadMapProvider
>

const baseConfig: MapConfigContextValue = {
  provider: 'osm',
  googleApiKey: '',
  anonymous: false,
  deferLoad: false,
}

function buildQuestion(mapOptions: Record<string, unknown> = {}) {
  return {
    _id: 'q1',
    code: 'Q1',
    type: QUESTION_TYPE_MAP,
    attributes: { mapOptions },
  } as unknown as SurveyQuestion
}

function buildProvider() {
  const handle: jest.Mocked<MapViewHandle> = {
    setPin: jest.fn(),
    clearPin: jest.fn(),
    destroy: jest.fn(),
  }
  let mapOptions: MapViewOptions | undefined
  const provider: jest.Mocked<MapProvider> = {
    name: 'osm',
    createMap: jest.fn(async (_element, options) => {
      mapOptions = options
      return handle
    }),
    search: jest.fn().mockResolvedValue([]),
    reverse: jest.fn(),
  }
  return {
    provider,
    handle,
    pick: (lat: number, lng: number) =>
      act(async () => mapOptions!.onPick(lat, lng)),
  }
}

async function renderMap(
  options: {
    mapOptions?: Record<string, unknown>
    config?: Partial<MapConfigContextValue>
    value?: unknown
    onChange?: jest.Mock
  } = {},
) {
  const onChange = options.onChange ?? jest.fn()
  await act(async () => {
    render(
      <MapConfigContext.Provider value={{ ...baseConfig, ...options.config }}>
        <QuestionTypeMap
          question={buildQuestion(options.mapOptions)}
          value={options.value}
          lang="en"
          langDefault="en"
          onChange={onChange}
        />
      </MapConfigContext.Provider>,
    )
  })
  return onChange
}

async function renderMapControlled() {
  let rerenderFn!: ReturnType<typeof render>['rerender']
  const element = (value?: unknown) => (
    <MapConfigContext.Provider value={baseConfig}>
      <QuestionTypeMap
        question={buildQuestion()}
        value={value}
        lang="en"
        langDefault="en"
        onChange={jest.fn()}
      />
    </MapConfigContext.Provider>
  )
  await act(async () => {
    rerenderFn = render(element()).rerender
  })
  return {
    rerenderWith: (value: unknown) => rerenderFn(element(value)),
  }
}

describe('QuestionTypeMap', () => {
  beforeEach(() => {
    mockLoadMapProvider.mockReset()
  })

  it('loads the configured provider and reports a clicked pin', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    const onChange = await renderMap()

    await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
    await fake.pick(51.5074, -0.1278)

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        lat: 51.5074,
        lng: -0.1278,
        precision: 'exact',
      }),
    )
    expect(mockLoadMapProvider).toHaveBeenCalledWith('osm', '')
  })

  it('opens at the configured centre and zoom', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap({
      mapOptions: { centerLat: 48.8, centerLng: 2.3, zoom: 9 },
    })

    await waitFor(() =>
      expect(fake.provider.createMap).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lat: 48.8, lng: 2.3, zoom: 9 }),
      ),
    )
  })

  it('opens on the browser place when the author left the view blank', async () => {
    const fake = buildProvider()
    fake.provider.search.mockResolvedValue([
      { lat: 51.5, lng: -0.12, address: 'London' },
    ])
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap()

    await waitFor(() =>
      expect(fake.provider.createMap).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lat: 51.5, lng: -0.12, zoom: 10 }),
      ),
    )
    expect(fake.provider.search).toHaveBeenCalledWith(
      'London, United Kingdom',
      ['GB'],
    )
  })

  it('opens on the world when the browser place is not found', async () => {
    const fake = buildProvider()
    fake.provider.search.mockResolvedValue([])
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap()

    await waitFor(() =>
      expect(fake.provider.createMap).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lat: 20, lng: 0, zoom: 3 }),
      ),
    )
  })

  it('does not geocode when the author set a view', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap({ mapOptions: { centerLat: 48.8, centerLng: 2.3 } })

    await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
    expect(fake.provider.search).not.toHaveBeenCalled()
  })

  it('does not restart the map when a pin is chosen', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    const onChange = jest.fn()
    await renderMap({ onChange })

    await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
    await fake.pick(51.5, -0.12)

    expect(onChange).toHaveBeenCalled()
    expect(fake.provider.createMap).toHaveBeenCalledTimes(1)
  })

  it('places an existing answer on the map', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap({ value: { lat: 40, lng: -3, precision: 'exact' } })

    await waitFor(() => expect(fake.handle.setPin).toHaveBeenCalledWith(40, -3))
  })

  it('zooms to street level on a searched place but not on a map click', async () => {
    const fake = buildProvider()
    fake.provider.search.mockImplementation(async (query) =>
      query === 'London'
        ? [{ lat: 51.5, lng: -0.12, address: 'London, UK' }]
        : [],
    )
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    const { rerenderWith } = await renderMapControlled()

    await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
    await fake.pick(10, 10)
    rerenderWith({ lat: 10, lng: 10, precision: 'exact' })
    await waitFor(() =>
      expect(fake.handle.setPin).toHaveBeenLastCalledWith(10, 10, undefined),
    )

    fireEvent.change(screen.getByLabelText('Search for a place'), {
      target: { value: 'London' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Search$/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'London, UK' }))
    rerenderWith({ lat: 51.5, lng: -0.12, precision: 'exact' })

    await waitFor(() =>
      expect(fake.handle.setPin).toHaveBeenLastCalledWith(51.5, -0.12, 17),
    )
  })

  it('rounds the pin and hides device location for anonymous surveys', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    const onChange = await renderMap({
      mapOptions: { useMyLocation: true },
      config: { anonymous: true },
    })

    await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
    await fake.pick(51.5074, -0.1278)

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        lat: 51.5,
        lng: -0.1,
        precision: 'coarse',
      }),
    )
    expect(screen.queryByText('Use my location')).toBeNull()
  })

  it('falls back to OpenStreetMap when Google is chosen without a key', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap({ mapOptions: { provider: 'google' } })

    await waitFor(() => expect(mockLoadMapProvider).toHaveBeenCalled())
    expect(mockLoadMapProvider).toHaveBeenCalledWith('osm', '')
  })

  it('uses Google when chosen and a key exists', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap({
      mapOptions: { provider: 'google' },
      config: { googleApiKey: 'key-1' },
    })

    await waitFor(() => expect(mockLoadMapProvider).toHaveBeenCalled())
    expect(mockLoadMapProvider).toHaveBeenCalledWith('google', 'key-1')
  })

  it('does not contact a map service until the map is requested when deferred', async () => {
    const fake = buildProvider()
    mockLoadMapProvider.mockResolvedValue(fake.provider)
    await renderMap({ config: { deferLoad: true } })

    expect(mockLoadMapProvider).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Show map' }))

    await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
  })

  it('shows a message when the map cannot load', async () => {
    mockLoadMapProvider.mockRejectedValue(new Error('offline'))
    await renderMap()

    expect(
      await screen.findByText(/The map could not be loaded/),
    ).toBeInTheDocument()
  })

  describe('country restriction', () => {
    it('rejects a pin outside the allowed countries', async () => {
      const fake = buildProvider()
      fake.provider.reverse.mockResolvedValue({ countryCode: 'FR' })
      mockLoadMapProvider.mockResolvedValue(fake.provider)
      const onChange = await renderMap({ mapOptions: { countries: 'GB' } })

      await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
      await fake.pick(48.85, 2.35)

      expect(
        await screen.findByText('Choose a location in an allowed country.'),
      ).toBeInTheDocument()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('accepts a pin inside the allowed countries and records the country', async () => {
      const fake = buildProvider()
      fake.provider.reverse.mockResolvedValue({
        address: 'London, UK',
        countryCode: 'GB',
      })
      mockLoadMapProvider.mockResolvedValue(fake.provider)
      const onChange = await renderMap({ mapOptions: { countries: 'GB' } })

      await waitFor(() => expect(fake.provider.createMap).toHaveBeenCalled())
      await fake.pick(51.5, -0.12)

      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith({
          lat: 51.5,
          lng: -0.12,
          precision: 'exact',
          address: 'London, UK',
          countryCode: 'GB',
        }),
      )
    })
  })

  describe('address search', () => {
    it('lists results and chooses one with its address', async () => {
      const fake = buildProvider()
      fake.provider.search.mockResolvedValue([
        { lat: 51.5, lng: -0.12, address: 'London, UK', countryCode: 'GB' },
      ])
      mockLoadMapProvider.mockResolvedValue(fake.provider)
      const onChange = await renderMap()

      fireEvent.change(screen.getByLabelText('Search for a place'), {
        target: { value: 'London' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Search/ }))
      fireEvent.click(await screen.findByRole('button', { name: 'London, UK' }))

      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith({
          lat: 51.5,
          lng: -0.12,
          precision: 'exact',
          address: 'London, UK',
          countryCode: 'GB',
        }),
      )
      expect(fake.provider.search).toHaveBeenCalledWith('London', [])
    })

    it('drops the address from a result in an anonymous survey', async () => {
      const fake = buildProvider()
      fake.provider.search.mockResolvedValue([
        { lat: 51.5074, lng: -0.1278, address: 'London, UK' },
      ])
      mockLoadMapProvider.mockResolvedValue(fake.provider)
      const onChange = await renderMap({ config: { anonymous: true } })

      fireEvent.change(screen.getByLabelText('Search for a place'), {
        target: { value: 'London' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Search/ }))
      fireEvent.click(await screen.findByRole('button', { name: 'London, UK' }))

      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith({
          lat: 51.5,
          lng: -0.1,
          precision: 'coarse',
        }),
      )
    })

    it('is hidden when address search is off', async () => {
      mockLoadMapProvider.mockResolvedValue(buildProvider().provider)
      await renderMap({ mapOptions: { addressSearch: false } })

      expect(screen.queryByLabelText('Search for a place')).toBeNull()
    })

    it('says so when nothing is found', async () => {
      const fake = buildProvider()
      fake.provider.search.mockResolvedValue([])
      mockLoadMapProvider.mockResolvedValue(fake.provider)
      await renderMap()

      fireEvent.change(screen.getByLabelText('Search for a place'), {
        target: { value: 'zzzz' },
      })
      fireEvent.click(screen.getByRole('button', { name: /Search/ }))

      expect(await screen.findByText(/No places found/)).toBeInTheDocument()
    })
  })

  describe('device location', () => {
    afterEach(() => {
      Reflect.deleteProperty(navigator, 'geolocation')
    })

    it('uses the device position when allowed', async () => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: PositionCallback) =>
            success({
              coords: { latitude: 52.2, longitude: 0.12 },
            } as GeolocationPosition),
        },
      })
      mockLoadMapProvider.mockResolvedValue(buildProvider().provider)
      const onChange = await renderMap({ mapOptions: { useMyLocation: true } })

      fireEvent.click(screen.getByRole('button', { name: /Use my location/ }))

      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith({
          lat: 52.2,
          lng: 0.12,
          precision: 'exact',
        }),
      )
    })
  })

  it('clears the answer', async () => {
    mockLoadMapProvider.mockResolvedValue(buildProvider().provider)
    const onChange = await renderMap({
      value: { lat: 40, lng: -3, precision: 'exact' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Clear location' }))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
