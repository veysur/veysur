import {
  formatDate,
  formatDateLong,
  formatDateTime,
  formatDateTimeLong,
  formatCalendar,
} from './formatDateTime'

// A fixed winter instant and a fixed summer instant, used to check that the
// helpers render wall-clock time in the requested zone (and honour DST).
const WINTER = '2026-01-15T12:00:00Z'
const SUMMER = '2026-07-15T12:00:00Z'

describe('formatDateTime helpers', () => {
  describe('formatDate', () => {
    it('renders the date in the given zone, en-GB order', () => {
      expect(formatDate(WINTER, 'Europe/London')).toBe('15 Jan 2026')
      expect(formatDate(WINTER, 'Australia/Sydney')).toBe('15 Jan 2026')
    })

    it('can roll to the next calendar day in an eastern zone', () => {
      // 23:00 UTC is 08:00 next day in Sydney (UTC+11 in January)
      expect(formatDate('2026-01-15T23:00:00Z', 'Australia/Sydney')).toBe(
        '16 Jan 2026',
      )
    })

    it('returns an empty string for nullish input', () => {
      expect(formatDate(null, 'Europe/London')).toBe('')
      expect(formatDate(undefined, 'Europe/London')).toBe('')
    })
  })

  describe('formatDateLong', () => {
    it('uses the full month name', () => {
      expect(formatDateLong(WINTER, 'Europe/London')).toBe('15 January 2026')
    })
  })

  describe('formatDateTime / formatDateTimeLong', () => {
    it('renders wall-clock time in the zone', () => {
      expect(formatDateTime(WINTER, 'Europe/London')).toBe('15 Jan 2026 12:00')
      expect(formatDateTime(WINTER, 'America/New_York')).toBe(
        '15 Jan 2026 07:00',
      )
      expect(formatDateTimeLong(WINTER, 'Europe/London')).toBe(
        '15 January 2026 12:00',
      )
    })

    it('honours British Summer Time', () => {
      // London is UTC+1 in July, so 12:00 UTC is 13:00 local
      expect(formatDateTime(SUMMER, 'Europe/London')).toBe('15 Jul 2026 13:00')
    })
  })

  describe('formatCalendar', () => {
    it('returns "Today at ..." for an instant earlier the same day', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-15T18:00:00Z'))
      expect(formatCalendar(WINTER, 'Europe/London')).toBe('Today at 12:00')
      jest.useRealTimers()
    })

    it('returns an empty string for nullish input', () => {
      expect(formatCalendar(null, 'Europe/London')).toBe('')
    })
  })
})
