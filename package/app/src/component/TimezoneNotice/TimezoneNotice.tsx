import React from 'react'
import { Clock } from 'lucide-react'

import { cn } from 'common'

export type TimezoneNoticeMode = 'project' | 'local' | 'fixed'

interface TimezoneNoticeProps {
  /** IANA zone name, e.g. "Europe/London". */
  timezone: string
  mode: TimezoneNoticeMode
  className?: string
}

const label = (mode: TimezoneNoticeMode, timezone: string): string => {
  switch (mode) {
    case 'project':
      return `Project timezone: ${timezone}`
    case 'local':
      return `Your local timezone: ${timezone}`
    case 'fixed':
      return `All times shown in ${timezone}`
  }
}

/**
 * One-line caption stating the zone every timestamp on the page/table is shown
 * in, so individual timestamps don't each need a zone suffix. See
 * `docs/timestamps.md`.
 */
export const TimezoneNotice: React.FC<TimezoneNoticeProps> = ({
  timezone,
  mode,
  className,
}) => {
  if (!timezone) return null

  return (
    <p
      className={cn(
        'flex items-center gap-1 text-xs text-muted-foreground',
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {label(mode, timezone)}
    </p>
  )
}
