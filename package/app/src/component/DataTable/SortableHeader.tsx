import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

import { cn } from 'common/cn'
import { SortDirection } from './types'

export interface SortableHeaderProps {
  label: React.ReactNode
  active: boolean
  direction?: SortDirection
  onClick: () => void
}

/**
 * Clickable column header with up/down sort affordance. Toggles between
 * ascending and descending on each click — there is no "unsorted" third
 * state since sortable lists always have a natural default sort.
 */
export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  active,
  direction,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 -mx-1 px-1 py-0.5 rounded hover:bg-muted/50',
        active ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      {label}
      {active ? (
        direction === 'asc' ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  )
}
