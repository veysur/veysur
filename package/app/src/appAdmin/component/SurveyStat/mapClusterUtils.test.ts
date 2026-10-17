import { clusterDiameter, clusterPoints } from './mapClusterUtils'

// 1 degree = 100 px, y grows southwards like a screen
const project = (lat: number, lng: number) => ({ x: lng * 100, y: -lat * 100 })

describe('clusterPoints', () => {
  it('merges points in the same pixel cell at their count-weighted centre', () => {
    const clusters = clusterPoints(
      [
        { lat: 0.1, lng: 0.1, count: 3 },
        { lat: 0.2, lng: 0.3, count: 1 },
      ],
      project,
      60,
    )

    expect(clusters).toHaveLength(1)
    expect(clusters[0].count).toBe(4)
    expect(clusters[0].points).toBe(2)
    expect(clusters[0].lat).toBeCloseTo(0.125)
    expect(clusters[0].lng).toBeCloseTo(0.15)
  })

  it('keeps distant points apart', () => {
    const clusters = clusterPoints(
      [
        { lat: 0, lng: 0, count: 1 },
        { lat: 10, lng: 10, count: 2 },
      ],
      project,
      60,
    )

    expect(clusters.map((c) => c.count).sort()).toEqual([1, 2])
    expect(clusters.every((c) => c.points === 1)).toBe(true)
  })

  it('splits points as the projection spreads them out (zooming in)', () => {
    const points = [
      { lat: 0, lng: 0.1, count: 1 },
      { lat: 0, lng: 0.3, count: 1 },
    ]
    const zoomedIn = (lat: number, lng: number) => {
      const { x, y } = project(lat, lng)
      return { x: x * 4, y: y * 4 }
    }

    expect(clusterPoints(points, project, 60)).toHaveLength(1)
    expect(clusterPoints(points, zoomedIn, 60)).toHaveLength(2)
  })

  it('returns nothing for no points', () => {
    expect(clusterPoints([], project, 60)).toEqual([])
  })

  it('never loses a pin', () => {
    const points = Array.from({ length: 50 }, (_, i) => ({
      lat: i / 7,
      lng: i / 3,
      count: i + 1,
    }))
    const total = clusterPoints(points, project, 60).reduce(
      (sum, c) => sum + c.count,
      0,
    )

    expect(total).toBe(points.reduce((sum, p) => sum + p.count, 0))
  })
})

describe('clusterDiameter', () => {
  it('grows with the count and stays within bounds', () => {
    expect(clusterDiameter(1)).toBe(28)
    expect(clusterDiameter(100)).toBeGreaterThan(clusterDiameter(10))
    expect(clusterDiameter(10_000_000)).toBe(56)
  })
})
