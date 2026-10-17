import React, { useEffect, useRef, useState } from 'react'

import { Spinner } from 'component/shadcn/spinner'

import type { QuestionStats } from './model/api/SurveyStatsApi'
import { createResultsMap } from './resultsMap'
import { StatSummaryGrid } from './chartComponents'

interface Props {
  questionStat: QuestionStats
}

const TOP_AREAS = 5

export const SurveyStatMapChart: React.FC<Props> = ({ questionStat }) => {
  const mapStats = questionStat.mapStats
  const element = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    if (!mapStats || mapStats.pinCount === 0 || !element.current) return
    let cancelled = false
    let destroy: (() => void) | null = null
    createResultsMap(element.current, mapStats)
      .then((handle) => {
        if (cancelled) {
          handle.destroy()
          return
        }
        destroy = handle.destroy
        setState('ready')
      })
      .catch(() => !cancelled && setState('failed'))
    return () => {
      cancelled = true
      destroy?.()
    }
  }, [mapStats])

  if (!mapStats || mapStats.pinCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No locations have been chosen yet.
      </p>
    )
  }

  const { pinCount, distinctPoints, truncated, points } = mapStats

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {pinCount} {pinCount === 1 ? 'location' : 'locations'} in{' '}
        {distinctPoints} {distinctPoints === 1 ? 'place' : 'places'}. Select a
        bubble to zoom in.
      </p>

      <div
        ref={element}
        role="application"
        aria-label="Map of chosen locations"
        className="relative z-0 h-96 w-full overflow-hidden rounded-md border bg-muted"
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

      {truncated && (
        <p className="text-sm text-muted-foreground">
          The map shows the {points.length} busiest places. Quieter places are
          left out, but all {pinCount} locations are counted.
        </p>
      )}

      <StatSummaryGrid
        items={points.slice(0, TOP_AREAS).map((point) => ({
          key: `${point.lat},${point.lng}`,
          label: `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`,
          value: String(point.count),
        }))}
      />
    </div>
  )
}
