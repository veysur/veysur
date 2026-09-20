import momentTimezone from 'moment-timezone'

import { ColumnDefinition } from './types'

export function dateColumn<T>({
  key,
  title = 'Date',
  getDate,
  format = 'll',
  timezone,
  className = 'w-28',
  sortKey,
}: {
  key: string
  title?: React.ReactNode
  getDate: (row: T) => Date | string | null | undefined
  format?: string
  /** IANA zone to render in — pass `useDisplayTimezone()`. Falls back to the browser zone. */
  timezone?: string
  className?: string
  /** Server-side sort field name for this column. Presence makes the header clickable to sort. */
  sortKey?: string
}): ColumnDefinition<T> {
  return {
    key,
    title,
    className,
    sortKey,
    render: (row) => {
      const date = getDate(row)
      return date
        ? momentTimezone(date)
            .tz(timezone || momentTimezone.tz.guess())
            .format(format)
        : '—'
    },
  }
}
