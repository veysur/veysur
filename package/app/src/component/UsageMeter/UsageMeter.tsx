import React from 'react'

import { Progress } from 'component/shadcn/progress'
import { cn } from 'common/cn'

type Props = {
  label: string
  used: number
  limit: number
  /** Format the "used / limit" display. Defaults to plain numbers. */
  format?: (value: number) => string
  className?: string
}

export const UsageMeter: React.FC<Props> = ({
  label,
  used,
  limit,
  format,
  className,
}) => {
  const pct = Math.min((used / limit) * 100, 100)
  const isWarning = pct >= 80
  const isAtLimit = pct >= 100

  const fmt = format ?? ((n: number) => String(n))

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            'font-medium tabular-nums',
            isAtLimit && 'text-destructive',
            isWarning && !isAtLimit && 'text-warning',
          )}
        >
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <Progress
        value={pct}
        className={cn(
          isAtLimit && '[&>div]:bg-destructive/80',
          isWarning && !isAtLimit && '[&>div]:bg-warning',
        )}
      />
    </div>
  )
}
