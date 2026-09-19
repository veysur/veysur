import React from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { Button } from 'component/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'component/shadcn/dropdown-menu'

export interface SnapshotActionsDropdownProps {
  hasSelection: boolean
  selectionCount: number | 'all'
  onDelete: () => void
}

export const SnapshotActionsDropdown: React.FC<
  SnapshotActionsDropdownProps
> = ({ hasSelection, selectionCount, onDelete }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
          {hasSelection && ` (${selectionCount})`}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!hasSelection}
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
