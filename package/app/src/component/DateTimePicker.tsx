import React from 'react'
import { format } from 'date-fns'
import momentTimezone from 'moment-timezone'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from 'common/cn'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'
import { Button } from 'component/shadcn/button'
import { Calendar } from 'component/shadcn/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'component/shadcn/popover'

interface DateTimePickerProps {
  value?: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  /** IANA zone the wall-clock date and time are entered in; browser zone when omitted. */
  timezone?: string
}

/**
 * The instant's wall-clock reading in `timezone`, as a browser-local Date with
 * the same fields (the calendar widget and date-fns only work in local time).
 */
export const toWallClock = (date: Date, timezone?: string): Date => {
  if (!timezone) return date
  const m = momentTimezone.tz(date, timezone)
  return new Date(m.year(), m.month(), m.date(), m.hour(), m.minute(), 0, 0)
}

/** Inverse of `toWallClock`: the instant whose reading in `timezone` is the local fields of `wallClock`. */
export const fromWallClock = (wallClock: Date, timezone?: string): Date => {
  if (!timezone) return wallClock
  return momentTimezone
    .tz(
      {
        year: wallClock.getFullYear(),
        month: wallClock.getMonth(),
        date: wallClock.getDate(),
        hour: wallClock.getHours(),
        minute: wallClock.getMinutes(),
      },
      timezone,
    )
    .toDate()
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Pick a date and time',
  disabled,
  timezone,
}) => {
  // Everything below works on wall-clock Dates; only the edges convert.
  const wallValue = React.useMemo(
    () => (value ? toWallClock(value, timezone) : null),
    [value, timezone],
  )
  const [date, setDate] = React.useState<Date | undefined>(
    wallValue || undefined,
  )
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (wallValue) {
      const hours = wallValue.getHours().toString().padStart(2, '0')
      const minutes = wallValue.getMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    }
    return '00:00'
  })

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined)
      onChange(null)
      return
    }

    // Preserve the time when date changes
    const [hours, minutes] = timeValue.split(':').map(Number)
    const newDate = new Date(selectedDate)
    newDate.setHours(hours, minutes, 0, 0)
    setDate(newDate)
    onChange(fromWallClock(newDate, timezone))
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)

    if (date) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours, minutes, 0, 0)
      setDate(newDate)
      onChange(fromWallClock(newDate, timezone))
    }
  }

  React.useEffect(() => {
    if (wallValue) {
      setDate(wallValue)
      const hours = wallValue.getHours().toString().padStart(2, '0')
      const minutes = wallValue.getMinutes().toString().padStart(2, '0')
      setTimeValue(`${hours}:${minutes}`)
    } else {
      setDate(undefined)
      setTimeValue('00:00')
    }
  }, [wallValue])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full min-w-0 justify-start text-left font-normal',
            !date && 'text-muted-foreground',
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {date ? format(date, 'PPP HH:mm') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
          captionLayout="dropdown"
          startMonth={new Date(new Date().getFullYear() - 120, 0)}
          endMonth={new Date(new Date().getFullYear() + 20, 11)}
        />
        <div className="p-3 border-t border-border">
          <Label className="text-xs mb-2 block">Time</Label>
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled || !date}
            className="w-full bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
