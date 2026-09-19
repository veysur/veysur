import React from 'react'
import { Search, X, ChevronDown, Trash2, MailX } from 'lucide-react'
import { CompletionStatusFilter } from 'veysur-common'

import type { useSelection } from 'hook'
import { Input } from 'component/shadcn/input'
import { Button } from 'component/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'component/shadcn/dropdown-menu'
import { FilterToolbar } from 'component/FilterToolbar'
import type { FilterFieldConfig, FilterValues } from 'component/FilterToolbar'

import { COMPLETION_STATUS_FILTER_OPTIONS } from './completionStatusFilterOptions'

const COMPLETION_STATUS_FIELDS: FilterFieldConfig[] = [
  {
    type: 'select',
    key: 'completionStatus',
    label: 'Completion status',
    allLabel: 'All statuses',
    options: COMPLETION_STATUS_FILTER_OPTIONS,
  },
]

interface ParticipantMassActionProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  completionStatus: CompletionStatusFilter
  onCompletionStatusChange: (status: CompletionStatusFilter) => void
  isFetching: boolean
  selection: ReturnType<typeof useSelection>
  onDeleteClick: () => void
  onResetInviteStatusClick: () => void
  onResetReminderStatusClick: () => void
  hasParticipants: boolean
}

export const ParticipantMassAction: React.FC<ParticipantMassActionProps> = ({
  searchQuery,
  onSearchChange,
  completionStatus,
  onCompletionStatusChange,
  isFetching,
  selection,
  onDeleteClick,
  onResetInviteStatusClick,
  onResetReminderStatusClick,
  hasParticipants,
}) => {
  const filterValues: FilterValues = { completionStatus }

  const handleFilterApply = (values: FilterValues) => {
    onCompletionStatusChange(
      (values.completionStatus as CompletionStatusFilter) || 'all',
    )
  }
  return (
    (searchQuery || completionStatus !== 'all' || hasParticipants) && (
      <div className="flex justify-between items-center my-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-64 pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 p-1 rounded hover:bg-muted"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FilterToolbar
            isFetching={isFetching}
            fields={COMPLETION_STATUS_FIELDS}
            values={filterValues}
            onApply={handleFilterApply}
            onClear={() => onCompletionStatusChange('all')}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Action
                {selection.hasSelection &&
                  ` (${selection.getSelectionCount()})`}
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!selection.hasSelection}
                onClick={onResetInviteStatusClick}
              >
                <MailX className="mr-2 h-4 w-4" />
                Reset Invite Status
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!selection.hasSelection}
                onClick={onResetReminderStatusClick}
              >
                <MailX className="mr-2 h-4 w-4" />
                Reset Reminder Status
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!selection.hasSelection}
                onClick={onDeleteClick}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  )
}
