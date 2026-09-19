import momentTimezone from 'moment-timezone'

type DateInput = string | number | Date | null | undefined

const inZone = (date: DateInput, timezone?: string) =>
  momentTimezone(date).tz(timezone || momentTimezone.tz.guess())

/**
 * Display helpers for system timestamps in `package/app`. Every function takes
 * an explicit IANA `timezone` (resolve it with the sub-app's
 * `useDisplayTimezone()` hook) so a timestamp is never silently rendered in
 * whatever zone the viewer's browser happens to be in. See `docs/timestamps.md`.
 *
 * Nullish input returns '' — call sites that want a placeholder keep their own
 * `|| '—'`.
 */

/** Date only, abbreviated month — e.g. "28 Aug 2026". */
export const formatDate = (date: DateInput, timezone?: string): string =>
  date == null ? '' : inZone(date, timezone).format('ll')

/** Date only, full month — e.g. "28 August 2026". */
export const formatDateLong = (date: DateInput, timezone?: string): string =>
  date == null ? '' : inZone(date, timezone).format('LL')

/** Date and time, abbreviated — e.g. "28 Aug 2026 14:30". */
export const formatDateTime = (date: DateInput, timezone?: string): string =>
  date == null ? '' : inZone(date, timezone).format('lll')

/** Date and time, full month — e.g. "28 August 2026 14:30". */
export const formatDateTimeLong = (
  date: DateInput,
  timezone?: string,
): string => (date == null ? '' : inZone(date, timezone).format('LLL'))

/**
 * Relative calendar phrasing against "now" in the target zone — e.g.
 * "Today at 14:30", "Last Monday at 09:12", or a plain date when further away.
 */
export const formatCalendar = (date: DateInput, timezone?: string): string =>
  date == null ? '' : inZone(date, timezone).calendar()
