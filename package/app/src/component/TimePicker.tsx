import React from 'react'
import { Clock } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { Label } from 'component/shadcn/label'
import { Input } from 'component/shadcn/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'component/shadcn/popover'

interface TimePickerProps {
  value?: string | null
  onChange: (time: string | null) => void
  placeholder?: string
  disabled?: boolean
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select a time',
  disabled,
}) => {
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    return value || ''
  })

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)
    onChange(newTime || null)
  }

  React.useEffect(() => {
    if (value) {
      setTimeValue(value)
    } else {
      setTimeValue('')
    }
  }, [value])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full min-w-0 justify-start text-left font-normal',
            !timeValue && 'text-muted-foreground',
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{timeValue || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <Label className="text-xs mb-2 block">Time</Label>
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled}
            className="w-full bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
