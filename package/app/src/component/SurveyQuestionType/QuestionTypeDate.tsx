import React from 'react'
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

import {
  ANSWER_CONTROL_MAX_WIDTH,
  QuestionTypeProps,
} from './QuestionTypeProps'

export const QuestionTypeDate: React.FC<QuestionTypeProps> = ({
  value,
  onChange,
}) => {
  const date = value ? new Date(value) : undefined

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange?.(format(selectedDate, 'yyyy-MM-dd'))
    } else {
      onChange?.(undefined)
    }
  }

  return (
    <div className={cn('grid', ANSWER_CONTROL_MAX_WIDTH)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full min-w-0 justify-start text-left font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {date ? format(date, 'PPP') : 'Select a date'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
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
    </div>
  )
}
