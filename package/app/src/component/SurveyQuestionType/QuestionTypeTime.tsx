import React from 'react'

import { cn } from 'common/cn'
import { TimePicker } from 'component/TimePicker'

import {
  ANSWER_CONTROL_MAX_WIDTH,
  QuestionTypeProps,
} from './QuestionTypeProps'

export const QuestionTypeTime: React.FC<QuestionTypeProps> = ({
  value,
  onChange,
}) => {
  const handleChange = (time: string | null) => {
    onChange?.(time || undefined)
  }

  return (
    <div className={cn('grid', ANSWER_CONTROL_MAX_WIDTH)}>
      <TimePicker value={value || null} onChange={handleChange} />
    </div>
  )
}
