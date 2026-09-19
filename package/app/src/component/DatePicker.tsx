import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { Calendar } from 'component/shadcn/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'component/shadcn/popover'

interface DatePickerProps {
  value?: string | null
  onChange: (date: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  className,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined,
  )

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'))
    } else {
      onChange(null)
    }
  }

  React.useEffect(() => {
    if (value) {
      setDate(new Date(value))
    } else {
      setDate(undefined)
    }
  }, [value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'h-9 min-w-0 justify-start border-input text-left font-normal',
            !date && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {date ? format(date, 'PPP') : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          captionLayout="dropdown"
          startMonth={new Date(new Date().getFullYear() - 120, 0)}
          endMonth={new Date(new Date().getFullYear() + 20, 11)}
        />
      </PopoverContent>
    </Popover>
  )
}
