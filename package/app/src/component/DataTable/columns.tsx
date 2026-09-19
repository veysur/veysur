import momentTimezone from 'moment-timezone'

import { Money } from 'veysur-common'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'component/shadcn/tooltip'
import { copyToClipboard } from 'common/copyToClipboard'

import { ColumnDefinition } from './types'
import { shortenDocumentCode } from './formatDocumentCode'

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

export function moneyColumn<T>({
  key,
  title = 'Total',
  getAmount,
  highlightNegative = false,
  hideZero = false,
  className = 'w-28 text-right',
}: {
  key: string
  title?: React.ReactNode
  getAmount: (row: T) => number | null | undefined
  highlightNegative?: boolean
  hideZero?: boolean
  className?: string
}): ColumnDefinition<T> {
  return {
    key,
    title,
    className,
    render: (row) => {
      const amount = getAmount(row) ?? 0
      if (hideZero && amount === 0) {
        return <span>-</span>
      }
      return (
        <span
          className={highlightNegative && amount < 0 ? 'text-destructive' : ''}
        >
          {Money.formatCurrency(amount)}
        </span>
      )
    },
  }
}

export function codeColumn<T>({
  key,
  title,
  getCode,
  fullCode,
  shorten = true,
  className = 'w-40',
}: {
  key: string
  title: React.ReactNode
  getCode: (row: T) => string | null | undefined
  fullCode?: (row: T) => string | null | undefined
  shorten?: boolean
  className?: string
}): ColumnDefinition<T> {
  return {
    key,
    title,
    className,
    render: (row) => {
      const raw = getCode(row)
      if (!raw) return <span className="text-sm">—</span>
      const full = fullCode ? (fullCode(row) ?? raw) : raw
      const display = shorten ? shortenDocumentCode(raw) : raw
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void copyToClipboard(full)
              }}
              className="text-sm truncate max-w-full text-left hover:underline"
            >
              {display}
            </button>
          </TooltipTrigger>
          <TooltipContent>{full} · Click to copy</TooltipContent>
        </Tooltip>
      )
    },
  }
}
