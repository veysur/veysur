import React, { useState } from 'react'
import { Filter, ChevronDown } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'component/shadcn/popover'
import { Button } from 'component/shadcn/button'
import {
  DateRangeFilterControl,
  DateRangeFilter,
  DEFAULT_DATE_RANGE_FILTER,
} from 'component/DateRangeFilter'

import { FilterFieldConfig, FilterFieldValue, FilterValues } from './types'

export interface FilterToolbarProps {
  isFetching: boolean
  fields: FilterFieldConfig[]
  values: FilterValues
  onApply: (values: FilterValues) => void
  /** Clears every active filter. When provided, renders a "Clear filters" button in the popover footer. */
  onClear?: () => void
  /** IANA timezone used to compute date-range presets (e.g. "Today"). Defaults to browser-local. */
  timezone?: string
}

const isFieldActive = (
  field: FilterFieldConfig,
  value: FilterFieldValue | undefined,
): boolean => {
  if (field.type === 'dateRange') {
    const dateValue = (value as DateRangeFilter) ?? DEFAULT_DATE_RANGE_FILTER
    return dateValue.startDate !== null || dateValue.endDate !== null
  }
  return !!value && value !== 'all'
}

const fieldsEqual = (
  field: FilterFieldConfig,
  a: FilterFieldValue | undefined,
  b: FilterFieldValue | undefined,
): boolean => {
  if (field.type === 'dateRange') {
    const dateA = (a as DateRangeFilter) ?? DEFAULT_DATE_RANGE_FILTER
    const dateB = (b as DateRangeFilter) ?? DEFAULT_DATE_RANGE_FILTER
    return (
      dateA.preset === dateB.preset &&
      dateA.startDate === dateB.startDate &&
      dateA.endDate === dateB.endDate &&
      dateA.dateField === dateB.dateField
    )
  }
  return (a ?? 'all') === (b ?? 'all')
}

/**
 * Shared list-view filter toolbar: a "Filters" button that opens a popover
 * of pending filter controls, applied only on "Apply Filters", with an
 * optional "Clear filters" action and a red-dot badge when any filter is
 * active.
 */
export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  isFetching,
  fields,
  values,
  onApply,
  onClear,
  timezone,
}) => {
  const [open, setOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<FilterValues>(values)

  // Sync pending state with props when they change externally — done at
  // render time (React's "adjusting state when a prop changes" pattern)
  // instead of in an effect, to avoid an extra render showing stale pending
  // values.
  const [prevValues, setPrevValues] = useState<FilterValues>(values)
  const changedFields = fields.filter(
    (field) => !fieldsEqual(field, values[field.key], prevValues[field.key]),
  )
  if (changedFields.length > 0) {
    setPrevValues(values)
    setPendingValues((current) => {
      const next = { ...current }
      changedFields.forEach((field) => {
        next[field.key] = values[field.key]
      })
      return next
    })
  }

  const handleApply = () => {
    onApply(pendingValues)
    setOpen(false)
  }

  const hasActiveFilters = fields.some((field) =>
    isFieldActive(field, values[field.key]),
  )

  const hasPendingChanges = fields.some(
    (field) => !fieldsEqual(field, pendingValues[field.key], values[field.key]),
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4" />
          Filters
          <ChevronDown className="ml-1 h-4 w-4" />
          {hasActiveFilters && (
            <span
              className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500"
              aria-label="Filters active"
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto min-w-[320px] bg-card text-card-foreground"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-2">
                <label className="text-sm font-medium">{field.label}</label>
                {field.type === 'select' ? (
                  <Select
                    value={(pendingValues[field.key] as string) || 'all'}
                    onValueChange={(value) =>
                      setPendingValues((current) => ({
                        ...current,
                        [field.key]: value,
                      }))
                    }
                    disabled={isFetching}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{field.allLabel}</SelectItem>
                      {field.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <DateRangeFilterControl
                    value={
                      (pendingValues[field.key] as DateRangeFilter) ||
                      DEFAULT_DATE_RANGE_FILTER
                    }
                    onChange={(filter) =>
                      setPendingValues((current) => ({
                        ...current,
                        [field.key]: filter,
                      }))
                    }
                    disabled={isFetching}
                    dateFieldOptions={field.dateFieldOptions}
                    showDateFieldSelector={field.showDateFieldSelector}
                    timezone={timezone}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            {onClear && (
              <Button
                variant="ghost"
                onClick={() => {
                  onClear()
                  setOpen(false)
                }}
                disabled={isFetching || !hasActiveFilters}
                size="sm"
              >
                Clear filters
              </Button>
            )}
            <Button
              onClick={handleApply}
              disabled={isFetching || !hasPendingChanges}
              size="sm"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
