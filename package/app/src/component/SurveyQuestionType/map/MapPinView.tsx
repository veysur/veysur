import React, { useEffect, useRef, useState } from 'react'

import { Spinner } from 'component/shadcn/spinner'

import { loadMapProvider } from './loadMapProvider'

type Props = {
  lat: number
  lng: number
  zoom?: number
}

/** A read-only OpenStreetMap with one pin, for showing a recorded answer. */
export const MapPinView: React.FC<Props> = ({ lat, lng, zoom = 13 }) => {
  const element = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    if (!element.current) return
    let cancelled = false
    let destroy: (() => void) | null = null
    loadMapProvider('osm', '')
      .then((provider) =>
        provider.createMap(element.current as HTMLElement, {
          lat,
          lng,
          zoom,
          onPick: () => {},
        }),
      )
      .then((handle) => {
        if (cancelled) {
          handle.destroy()
          return
        }
        destroy = handle.destroy
        handle.setPin(lat, lng)
        setState('ready')
      })
      .catch(() => !cancelled && setState('failed'))
    return () => {
      cancelled = true
      destroy?.()
    }
  }, [lat, lng, zoom])

  return (
    <div
      ref={element}
      role="img"
      aria-label={`Map showing the answer at ${lat}, ${lng}`}
      className="relative z-0 h-48 w-full overflow-hidden rounded-md border bg-muted"
    >
      {state === 'loading' && (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      )}
      {state === 'failed' && (
        <p className="p-3 text-sm text-muted-foreground">
          The map could not be loaded.
        </p>
      )}
    </div>
  )
}
