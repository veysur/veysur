import { isMapAnswer } from 'veysur-common'

import type { MapStatPoint, MapStats, StatsResponse } from './types'

/** Three decimal places of latitude or longitude is about 110 m. */
export const MAP_STATS_GRID_DECIMALS = 3
export const MAP_STATS_MAX_POINTS = 5000

const GRID_FACTOR = 10 ** MAP_STATS_GRID_DECIMALS

function toGrid(value: number): number {
  return Math.round(value * GRID_FACTOR) / GRID_FACTOR
}

/**
 * Groups every valid pin for a map question into grid cells. Missing or
 * malformed answers are ignored. Cells are ordered busiest first, then by
 * position so the result is stable, and capped at `MAP_STATS_MAX_POINTS`.
 */
export function buildMapStats(
  questionCode: string,
  responses: StatsResponse[],
): MapStats {
  const cells = new Map<string, MapStatPoint>()
  let pinCount = 0
  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity

  for (const response of responses) {
    const answer = response.answers[questionCode]
    if (!isMapAnswer(answer)) continue

    const lat = toGrid(answer.lat)
    const lng = toGrid(answer.lng)
    const key = `${lat},${lng}`
    const cell = cells.get(key)
    if (cell) cell.count += 1
    else cells.set(key, { lat, lng, count: 1 })

    pinCount += 1
    south = Math.min(south, lat)
    north = Math.max(north, lat)
    west = Math.min(west, lng)
    east = Math.max(east, lng)
  }

  const ordered = [...cells.values()].sort(
    (a, b) => b.count - a.count || a.lat - b.lat || a.lng - b.lng,
  )

  return {
    points: ordered.slice(0, MAP_STATS_MAX_POINTS),
    pinCount,
    distinctPoints: ordered.length,
    truncated: ordered.length > MAP_STATS_MAX_POINTS,
    bounds: pinCount > 0 ? [south, west, north, east] : null,
  }
}
