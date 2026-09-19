import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'

type Props = {
  title: string
  icon?: React.ReactNode
  summary?: React.ReactNode
  defaultExpanded?: boolean
  children: React.ReactNode
  className?: string
}

export const CollapsibleSection: React.FC<Props> = ({
  title,
  icon,
  summary,
  defaultExpanded = false,
  children,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={cn('mb-4', className)}>
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50 rounded-none border-b border-border"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {!isExpanded && summary && (
            <span className="text-sm text-muted-foreground truncate">
              {summary}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </div>
      </Button>
      {isExpanded && <div className="mt-3 px-3 pb-3">{children}</div>}
    </div>
  )
}
