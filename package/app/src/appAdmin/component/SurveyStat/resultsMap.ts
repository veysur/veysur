import {
  OSM_ATTRIBUTION,
  OSM_TILE_URL,
} from 'component/SurveyQuestionType/map/OsmProvider'

import { clusterDiameter, clusterPoints } from './mapClusterUtils'
import type { MapStats } from './model/api/SurveyStatsApi'

const CLUSTER_CELL_PX = 60
const SINGLE_ZOOM = 12
const MAX_FIT_ZOOM = 14

export interface ResultsMapHandle {
  destroy: () => void
}

/**
 * Draws grouped pins on an OpenStreetMap, merged into count bubbles that
 * split as the map zooms in. Results are an admin-side view, so this always
 * uses OpenStreetMap, whichever provider the question used.
 */
export async function createResultsMap(
  element: HTMLElement,
  { points, bounds }: Pick<MapStats, 'points' | 'bounds'>,
): Promise<ResultsMapHandle> {
  const [{ default: L }] = await Promise.all([
    import('leaflet'),
    import('leaflet/dist/leaflet.css'),
  ])

  const map = L.map(element)
  L.tileLayer(OSM_TILE_URL, {
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
  }).addTo(map)

  if (bounds) {
    const [south, west, north, east] = bounds
    if (south === north && west === east) {
      map.setView([south, west], SINGLE_ZOOM)
    } else {
      map.fitBounds(
        [
          [south, west],
          [north, east],
        ],
        { maxZoom: MAX_FIT_ZOOM, padding: [30, 30] },
      )
    }
  } else {
    map.setView([20, 0], 2)
  }

  const bubbles = L.layerGroup().addTo(map)

  const render = () => {
    bubbles.clearLayers()
    const zoom = map.getZoom()
    const clusters = clusterPoints(
      points,
      (lat, lng) => map.project([lat, lng], zoom),
      CLUSTER_CELL_PX,
    )
    for (const cluster of clusters) {
      const size = clusterDiameter(cluster.count)
      const icon = L.divIcon({
        className: '',
        iconSize: [size, size],
        html: `<div style="width:${size}px;height:${size}px;line-height:${size}px;border-radius:50%;background:#1d4ed8;border:3px solid #fff;color:#fff;font:600 12px system-ui,sans-serif;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.4)">${cluster.count}</div>`,
      })
      const marker = L.marker([cluster.lat, cluster.lng], {
        icon,
        keyboard: false,
      })
      if (cluster.points > 1) {
        marker.on('click', () =>
          map.setView([cluster.lat, cluster.lng], Math.min(zoom + 2, 19)),
        )
      }
      marker.addTo(bubbles)
    }
  }

  map.on('zoomend', render)
  render()

  return { destroy: () => map.remove() }
}
