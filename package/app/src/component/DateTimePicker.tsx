import React from 'react'
import { format } from 'date-fns'
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
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Pick a date and time',
  disabled,
}) => {
  const [date, setDate] = React.useState<Date | undefined>(value || undefined)
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (value) {
      const hours = value.getHours().toString().padStart(2, '0')
      const minutes = value.getMinutes().toString().padStart(2, '0')
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
    onChange(newDate)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)

    if (date) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours, minutes, 0, 0)
      setDate(newDate)
      onChange(newDate)
    }
  }

  React.useEffect(() => {
    if (value) {
      setDate(value)
      const hours = value.getHours().toString().padStart(2, '0')
      const minutes = value.getMinutes().toString().padStart(2, '0')
      setTimeValue(`${hours}:${minutes}`)
    } else {
      setDate(undefined)
      setTimeValue('00:00')
    }
  }, [value])

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
