import React from 'react'
import { format, parseISO } from 'date-fns'

import { cn } from 'common/cn'
import { DateTimePicker } from 'component/DateTimePicker'

import {
  ANSWER_CONTROL_MAX_WIDTH,
  QuestionTypeProps,
} from './QuestionTypeProps'

export const QuestionTypeDateTime: React.FC<QuestionTypeProps> = ({
  value,
  onChange,
}) => {
  // Parse ISO string to Date for the DateTimePicker
  const date = value ? parseISO(value) : null

  const handleChange = (newDate: Date | null) => {
    if (newDate) {
      // Format as ISO datetime without timezone (yyyy-MM-ddTHH:mm)
      onChange?.(format(newDate, "yyyy-MM-dd'T'HH:mm"))
    } else {
      onChange?.(undefined)
    }
  }

  return (
    <div className={cn('grid', ANSWER_CONTROL_MAX_WIDTH)}>
      <DateTimePicker
        value={date}
        onChange={handleChange}
        placeholder="Select a date and time"
      />
    </div>
  )
}
