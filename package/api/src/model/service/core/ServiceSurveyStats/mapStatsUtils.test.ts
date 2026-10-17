import { MAP_STATS_MAX_POINTS, buildMapStats } from './mapStatsUtils'
import type { StatsResponse } from './types'

const pin = (lat: number, lng: number): StatsResponse => ({
  answers: { Q1: { lat, lng, precision: 'exact' } },
})

describe('buildMapStats', () => {
  it('groups pins that share a grid cell', () => {
    const stats = buildMapStats('Q1', [
      pin(51.50741, -0.12781),
      pin(51.50702, -0.12751),
      pin(48.8566, 2.3522),
    ])

    expect(stats.pinCount).toBe(3)
    expect(stats.distinctPoints).toBe(2)
    expect(stats.points).toEqual([
      { lat: 51.507, lng: -0.128, count: 2 },
      { lat: 48.857, lng: 2.352, count: 1 },
    ])
    expect(stats.truncated).toBe(false)
  })

  it('never returns more precision than the grid', () => {
    const [point] = buildMapStats('Q1', [pin(51.5074123, -0.1278456)]).points

    expect(point).toEqual({ lat: 51.507, lng: -0.128, count: 1 })
  })

  it('computes bounds over all pins as south, west, north, east', () => {
    const stats = buildMapStats('Q1', [pin(10, 20), pin(-5, 30), pin(7, -15)])

    expect(stats.bounds).toEqual([-5, -15, 10, 30])
  })

  it('ignores missing, malformed and out-of-range answers', () => {
    const stats = buildMapStats('Q1', [
      { answers: {} },
      { answers: { Q1: 'London' } },
      { answers: { Q1: { lat: 'x', lng: 1 } } },
      { answers: { Q1: { lat: 95, lng: 1 } } },
      { answers: { Q1: null } },
      pin(1, 2),
    ])

    expect(stats.pinCount).toBe(1)
    expect(stats.points).toHaveLength(1)
  })

  it('reports no bounds when there are no pins', () => {
    expect(buildMapStats('Q1', [{ answers: {} }])).toEqual({
      points: [],
      pinCount: 0,
      distinctPoints: 0,
      truncated: false,
      bounds: null,
    })
  })

  it('orders cells busiest first with a stable tie-break', () => {
    const stats = buildMapStats('Q1', [
      pin(2, 2),
      pin(1, 1),
      pin(3, 3),
      pin(3, 3),
    ])

    expect(stats.points.map((p) => [p.lat, p.count])).toEqual([
      [3, 2],
      [1, 1],
      [2, 1],
    ])
  })

  it('caps the points but still counts every pin', () => {
    const responses: StatsResponse[] = []
    for (let i = 0; i < MAP_STATS_MAX_POINTS + 10; i++) {
      responses.push(pin(Math.floor(i / 300) - 8, (i % 300) / 2 - 75))
    }

    const stats = buildMapStats('Q1', responses)

    expect(stats.points).toHaveLength(MAP_STATS_MAX_POINTS)
    expect(stats.distinctPoints).toBe(MAP_STATS_MAX_POINTS + 10)
    expect(stats.pinCount).toBe(MAP_STATS_MAX_POINTS + 10)
    expect(stats.truncated).toBe(true)
  })
})
