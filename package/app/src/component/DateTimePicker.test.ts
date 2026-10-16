import { fromWallClock, toWallClock } from './DateTimePicker'

describe('DateTimePicker wall-clock conversion', () => {
  it('reads an instant as the project zone wall clock', () => {
    const wall = toWallClock(new Date('2023-06-15T00:00:00Z'), 'Asia/Tokyo')
    expect([wall.getHours(), wall.getMinutes(), wall.getDate()]).toEqual([
      9, 0, 15,
    ])
  })

  it('round-trips through the zone', () => {
    const instant = new Date('2023-07-01T08:30:00Z')
    const zone = 'America/New_York'
    expect(fromWallClock(toWallClock(instant, zone), zone).toISOString()).toBe(
      instant.toISOString(),
    )
  })

  it('applies summer time in the zone', () => {
    const wall = new Date(2023, 5, 15, 9, 0)
    expect(fromWallClock(wall, 'Europe/London').toISOString()).toBe(
      '2023-06-15T08:00:00.000Z',
    )
    const winter = new Date(2023, 0, 15, 9, 0)
    expect(fromWallClock(winter, 'Europe/London').toISOString()).toBe(
      '2023-01-15T09:00:00.000Z',
    )
  })

  it('moves a non-existent spring-forward time forward', () => {
    const gap = new Date(2023, 2, 26, 1, 30)
    expect(fromWallClock(gap, 'Europe/London').toISOString()).toBe(
      '2023-03-26T01:30:00.000Z',
    )
  })

  it('returns the input unchanged without a zone', () => {
    const d = new Date(2023, 5, 15, 9, 0)
    expect(toWallClock(d)).toBe(d)
    expect(fromWallClock(d)).toBe(d)
  })
})
