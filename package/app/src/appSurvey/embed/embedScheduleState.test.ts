import { embedScheduleState } from './embedScheduleState'

describe('embedScheduleState', () => {
  const now = new Date('2026-10-07T12:00:00Z').getTime()

  test('is open without a schedule or inside the window', () => {
    expect(embedScheduleState(undefined, now)).toBe('open')
    expect(embedScheduleState({ start: null, end: null }, now)).toBe('open')
    expect(
      embedScheduleState(
        { start: '2026-10-01T00:00:00Z', end: '2026-10-31T00:00:00Z' },
        now,
      ),
    ).toBe('open')
  })

  test('has not started before the start', () => {
    expect(
      embedScheduleState({ start: '2026-10-08T00:00:00Z', end: null }, now),
    ).toBe('notStarted')
  })

  test('has ended after the end', () => {
    expect(
      embedScheduleState({ start: null, end: '2026-10-06T00:00:00Z' }, now),
    ).toBe('ended')
  })
})
