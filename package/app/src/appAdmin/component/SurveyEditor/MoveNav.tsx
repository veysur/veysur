import React from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'component/shadcn/tooltip'

interface MoveNavProps {
  onMoveUp?: () => void
  onMoveDown?: () => void
  className?: string
  itemType?: string
  layout?: 'stacked' | 'inline'
  horizontal?: boolean
}

const classnameActive = 'opacity-70 hover:opacity-100'
const classnameDisabled = '!opacity-30'

export const MoveNav: React.FC<MoveNavProps> = ({
  onMoveUp,
  onMoveDown,
  className = '',
  itemType = 'item',
  layout = 'stacked',
  horizontal = false,
}) => {
  if (!onMoveUp && !onMoveDown) {
    return null
  }

  const prevLabel = horizontal ? 'left' : 'up'
  const nextLabel = horizontal ? 'right' : 'down'
  const UpIcon = horizontal ? ChevronLeft : ChevronUp
  const DownIcon = horizontal ? ChevronRight : ChevronDown

  const upTooltipText = !onMoveUp
    ? `Cannot move ${itemType} ${prevLabel}`
    : `Move ${itemType} ${prevLabel}`

  const downTooltipText = !onMoveDown
    ? `Cannot move ${itemType} ${nextLabel}`
    : `Move ${itemType} ${nextLabel}`

  const wrapperClass =
    layout === 'inline'
      ? `move-nav flex flex-row ${className}`.trim()
      : `move-nav h-18 w-9 pb-10 ${className}`.trim()

  const moveUpOpacity = onMoveUp ? classnameActive : classnameDisabled
  const moveDownOpacity = onMoveDown ? classnameActive : classnameDisabled

  return (
    <TooltipProvider delayDuration={500}>
      <div
        className={wrapperClass}
        role="toolbar"
        aria-label={`Reorder ${itemType} controls`}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              aria-label={upTooltipText}
              className={cn([
                'move-nav-btn move-nav-up',
                'size-6 m-0.5',
                moveUpOpacity,
              ])}
              tabIndex={!onMoveUp ? -1 : 0}
            >
              <UpIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{upTooltipText}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              aria-label={downTooltipText}
              className={cn([
                'move-nav-btn move-nav-down',
                'size-6 m-0.5',
                moveDownOpacity,
              ])}
              tabIndex={!onMoveDown ? -1 : 0}
            >
              <DownIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{downTooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
