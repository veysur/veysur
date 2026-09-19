import React from 'react'
import { X } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'

import { DateRangeFilter } from './types'
import { getPresetDates, isValidDateRange } from './dateRangePresets'
import { DatePicker } from 'component/DatePicker'

export interface DateFieldOption {
  value: 'createdAt' | 'completed' | 'updatedAt'
  label: string
}

interface DateRangeFilterControlProps {
  value: DateRangeFilter
  onChange: (filter: DateRangeFilter) => void
  disabled?: boolean
  dateFieldOptions?: DateFieldOption[]
  showDateFieldSelector?: boolean
  timezone?: string
}

export const DateRangeFilterControl: React.FC<DateRangeFilterControlProps> = ({
  value,
  onChange,
  disabled,
  dateFieldOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'completed', label: 'Completed Date' },
  ],
  showDateFieldSelector = true,
  timezone,
}) => {
  const [error, setError] = React.useState<string | null>(null)

  const handlePresetChange = (preset: string) => {
    const dates = getPresetDates(preset, timezone)
    onChange({
      preset: preset as DateRangeFilter['preset'],
      startDate: dates.startDate,
      endDate: dates.endDate,
      dateField: value.dateField,
    })
    setError(null)
  }

  const handleDateFieldChange = (dateField: string) => {
    onChange({
      ...value,
      dateField: dateField as 'createdAt' | 'completed' | 'updatedAt',
    })
  }

  const handleCustomDateChange = (
    field: 'startDate' | 'endDate',
    newValue: string,
  ) => {
    const updatedFilter = {
      ...value,
      preset: 'custom' as const,
      [field]: newValue || null,
    }

    // Validate date range
    if (!isValidDateRange(updatedFilter.startDate, updatedFilter.endDate)) {
      setError('End date must be after or equal to start date')
      return
    }

    setError(null)
    onChange(updatedFilter)
  }

  const handleClear = () => {
    handlePresetChange('all')
  }

  const isCustom = value.preset === 'custom'
  const isFiltered = value.preset !== 'all'
  const showDateInputs = isFiltered // Show inputs for any preset except "all"
  const dateInputsReadOnly = !isCustom // Only editable when "custom" is selected

  return (
    <div className="flex flex-wrap items-start gap-2">
      <span className="text-sm text-muted-foreground">Date:</span>
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={value.preset}
            onValueChange={handlePresetChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="last90">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {showDateFieldSelector && (
            <Select
              value={value.dateField}
              onValueChange={handleDateFieldChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date field" />
              </SelectTrigger>
              <SelectContent>
                {dateFieldOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {showDateInputs && (
          <div className="flex items-center gap-2">
            <DatePicker
              value={value.startDate}
              onChange={(date) =>
                handleCustomDateChange('startDate', date || '')
              }
              placeholder="Start date"
              disabled={disabled || dateInputsReadOnly}
            />

            <span className="text-sm text-muted-foreground">to</span>

            <DatePicker
              value={value.endDate}
              onChange={(date) => handleCustomDateChange('endDate', date || '')}
              placeholder="End date"
              disabled={disabled || dateInputsReadOnly}
            />
          </div>
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="h-9"
            title="Clear date filter"
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
