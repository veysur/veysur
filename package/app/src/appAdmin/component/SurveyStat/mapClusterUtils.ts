import type { MapStatPoint } from './model/api/SurveyStatsApi'

export interface PixelPoint {
  x: number
  y: number
}

export interface MapCluster {
  lat: number
  lng: number
  count: number
  /** How many grouped locations were merged into this bubble. */
  points: number
}

/**
 * Merges nearby locations into count bubbles. Points whose projected pixel
 * position falls in the same `cellSize` square merge into one cluster placed
 * at their count-weighted centre. `project` maps a position to absolute pixel
 * coordinates at the current zoom, so a cell does not move when the map pans.
 */
export function clusterPoints(
  points: MapStatPoint[],
  project: (lat: number, lng: number) => PixelPoint,
  cellSize: number,
): MapCluster[] {
  const cells = new Map<
    string,
    { latSum: number; lngSum: number; count: number; points: number }
  >()

  for (const point of points) {
    const { x, y } = project(point.lat, point.lng)
    const key = `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`
    const cell = cells.get(key) ?? { latSum: 0, lngSum: 0, count: 0, points: 0 }
    cell.latSum += point.lat * point.count
    cell.lngSum += point.lng * point.count
    cell.count += point.count
    cell.points += 1
    cells.set(key, cell)
  }

  return [...cells.values()].map((cell) => ({
    lat: cell.latSum / cell.count,
    lng: cell.lngSum / cell.count,
    count: cell.count,
    points: cell.points,
  }))
}

/** Bubble diameter in pixels: grows with the log of the count, between 28 and 56. */
export function clusterDiameter(count: number): number {
  return Math.round(Math.min(56, 28 + Math.log10(count) * 14))
}
