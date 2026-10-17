import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed, Search, X } from 'lucide-react'
import {
  MapAnswer,
  MapOptions,
  MapStartView,
  MAP_ZOOM_STREET,
  effectiveMapPrecision,
  isMapAnswer,
  parseMapCountries,
  resolveQuestionMapProvider,
  toMapAnswer,
} from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { Input } from 'component/shadcn/input'
import { Spinner } from 'component/shadcn/spinner'
import { useMapConfig } from 'component/Survey/MapConfigContext'

import { QuestionTypeProps } from './QuestionTypeProps'
import { GeocodeResult, MapProvider, MapViewHandle } from './map/MapProvider'
import { loadMapProvider } from './map/loadMapProvider'
import {
  readBrowserHints,
  readGrantedPosition,
  resolveMapStart,
} from './map/resolveMapStart'

const DEFAULT_OPTIONS: MapOptions = {
  provider: 'default',
  centerLat: null,
  centerLng: null,
  zoom: null,
  addressSearch: true,
  useMyLocation: false,
  countries: '',
  precision: 'exact',
}

export const QuestionTypeMap: React.FC<QuestionTypeProps> = ({
  question,
  value,
  onChange,
}) => {
  const options: MapOptions = {
    ...DEFAULT_OPTIONS,
    ...(question?.attributes?.mapOptions as Partial<MapOptions> | undefined),
  }
  const config = useMapConfig()
  const providerName = resolveQuestionMapProvider(options.provider, config)
  const precision = effectiveMapPrecision(options.precision, config.anonymous)
  const countries = useMemo(
    () => parseMapCountries(options.countries),
    [options.countries],
  )
  const answer = isMapAnswer(value) ? (value as MapAnswer) : null
  const canUseLocation =
    options.useMyLocation && !config.anonymous && 'geolocation' in navigator

  const [opened, setOpened] = useState(!config.deferLoad)
  const [provider, setProvider] = useState<MapProvider | null>(null)
  const [startView, setStartView] = useState<MapStartView | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const mapElement = useRef<HTMLDivElement>(null)
  const mapHandle = useRef<MapViewHandle | null>(null)
  // Set when a pin comes from a search result or the device, which should zoom to street level
  const focusPin = useRef(false)
  const answerRef = useRef(answer)
  answerRef.current = answer

  const choose = useCallback(
    async (
      lat: number,
      lng: number,
      known: { address?: string; countryCode?: string } = {},
    ) => {
      setNotice(null)
      setResults([])
      let { address, countryCode } = known
      if (provider && countries.length > 0 && !countryCode) {
        setBusy(true)
        try {
          const found = await provider.reverse(lat, lng)
          address = address ?? found?.address
          countryCode = found?.countryCode
        } catch {
          setNotice('We could not check the country of that location.')
          return
        } finally {
          setBusy(false)
        }
      }
      if (
        countries.length > 0 &&
        !(countryCode && countries.includes(countryCode.toUpperCase()))
      ) {
        setNotice('Choose a location in an allowed country.')
        return
      }
      onChange?.(toMapAnswer(lat, lng, precision, { address, countryCode }))
    },
    [provider, countries, precision, onChange],
  )

  const chooseRef = useRef(choose)
  chooseRef.current = choose

  useEffect(() => {
    if (!opened) return
    let cancelled = false
    setMapFailed(false)
    loadMapProvider(providerName, config.googleApiKey)
      .then((loaded) => !cancelled && setProvider(loaded))
      .catch(() => !cancelled && setMapFailed(true))
    return () => {
      cancelled = true
    }
  }, [opened, providerName, config.googleApiKey])

  const { centerLat, centerLng, zoom } = options
  const canUseLocationRef = useRef(canUseLocation)
  // Read once: choosing a pin must not restart the map
  const answeredAtStart = useRef(answer !== null)
  useEffect(() => {
    if (!provider) return
    let cancelled = false
    resolveMapStart({
      options: { centerLat, centerLng, zoom },
      provider,
      hasAnswer: answeredAtStart.current,
      hints: readBrowserHints(),
      devicePosition: canUseLocationRef.current
        ? readGrantedPosition
        : undefined,
    }).then((view) => !cancelled && setStartView(view))
    return () => {
      cancelled = true
    }
  }, [provider, centerLat, centerLng, zoom])

  useEffect(() => {
    if (!provider || !startView || !mapElement.current) return
    let cancelled = false
    let handle: MapViewHandle | null = null
    const start = answerRef.current
    provider
      .createMap(mapElement.current, {
        lat: start?.lat ?? startView.lat,
        lng: start?.lng ?? startView.lng,
        zoom: start ? MAP_ZOOM_STREET : startView.zoom,
        onPick: (lat, lng) => void chooseRef.current(lat, lng),
      })
      .then((created) => {
        if (cancelled) {
          created.destroy()
          return
        }
        handle = created
        mapHandle.current = created
        const current = answerRef.current
        if (current) created.setPin(current.lat, current.lng)
      })
      .catch(() => !cancelled && setMapFailed(true))
    return () => {
      cancelled = true
      handle?.destroy()
      mapHandle.current = null
    }
  }, [provider, startView])

  const answerLat = answer?.lat
  const answerLng = answer?.lng
  useEffect(() => {
    if (answerLat !== undefined && answerLng !== undefined) {
      mapHandle.current?.setPin(
        answerLat,
        answerLng,
        focusPin.current ? MAP_ZOOM_STREET : undefined,
      )
      focusPin.current = false
    } else {
      mapHandle.current?.clearPin()
    }
  }, [answerLat, answerLng])

  const search = async (event: React.FormEvent) => {
    event.preventDefault()
    const text = query.trim()
    if (!text) return
    setNotice(null)
    setBusy(true)
    try {
      const active =
        provider ?? (await loadMapProvider(providerName, config.googleApiKey))
      if (!provider) setProvider(active)
      const found = await active.search(text, countries)
      setResults(found)
      if (found.length === 0)
        setNotice('No places found. Try a different search.')
    } catch {
      setNotice('Search is unavailable right now.')
    } finally {
      setBusy(false)
    }
  }

  const useMyLocation = () => {
    setNotice(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        focusPin.current = true
        void choose(position.coords.latitude, position.coords.longitude)
      },
      () => setNotice('We could not get your location.'),
    )
  }

  const clear = () => {
    setNotice(null)
    onChange?.(undefined)
  }

  return (
    <div className="grid gap-3">
      {options.addressSearch && (
        <form onSubmit={search} className="flex gap-2" role="search">
          <Input
            type="search"
            aria-label="Search for a place"
            placeholder="Search for a place"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={busy}>
            <Search aria-hidden="true" /> Search
          </Button>
        </form>
      )}

      {results.length > 0 && (
        <ul className="grid gap-1" aria-label="Search results">
          {results.map((result) => (
            <li key={`${result.lat},${result.lng},${result.address}`}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start whitespace-normal text-left"
                onClick={() => {
                  focusPin.current = true
                  void choose(result.lat, result.lng, {
                    address: result.address,
                    countryCode: result.countryCode,
                  })
                }}
              >
                {result.address}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {opened ? (
        <div
          ref={mapElement}
          role="application"
          aria-label="Map. Click to place a pin."
          className="relative z-0 h-72 w-full overflow-hidden rounded-md border bg-muted"
        >
          {(!provider || !startView) && !mapFailed && (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          )}
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpened(true)}>
          Show map
        </Button>
      )}

      {mapFailed && (
        <p role="alert" className="text-sm text-destructive">
          The map could not be loaded. You can still search for a place.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canUseLocation && (
          <Button type="button" variant="outline" onClick={useMyLocation}>
            <LocateFixed aria-hidden="true" /> Use my location
          </Button>
        )}
        {answer && (
          <>
            <span aria-live="polite" className="text-sm">
              {answer.address ??
                `${answer.lat.toFixed(precision === 'coarse' ? 1 : 5)}, ${answer.lng.toFixed(precision === 'coarse' ? 1 : 5)}`}
              {precision === 'coarse' && ' (approximate)'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              aria-label="Clear location"
            >
              <X aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      {notice && (
        <p role="alert" className="text-sm text-destructive">
          {notice}
        </p>
      )}
    </div>
  )
}
