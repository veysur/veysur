import React, { useState } from 'react'
import { MinMax } from 'veysur-common'

import { cn } from 'common/cn'
import { Input } from 'component/shadcn/input'
import { NUMERIC_TEXT_INPUT_PROPS } from 'component/constant'

import {
  ANSWER_CONTROL_MAX_WIDTH,
  QuestionTypeProps,
} from './QuestionTypeProps'

const INTEGER_PATTERN = /^-?[0-9]+$/

export const QuestionTypeNumber: React.FC<QuestionTypeProps> = ({
  question,
  value,
  onChange,
}) => {
  const numberMinMax = question?.attributes?.numberMinMax as
    Partial<MinMax> | undefined
  const min = numberMinMax?.min !== undefined ? numberMinMax?.min : undefined
  const max = numberMinMax?.max !== undefined ? numberMinMax?.max : undefined

  // Buffered locally so an in-progress entry like "-" (a valid prefix of a
  // negative number but not a parsable number itself) isn't wiped out when
  // it round-trips back through the `value` prop as undefined.
  const [rawValue, setRawValue] = useState(
    value !== undefined ? String(value) : '',
  )
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setRawValue(value !== undefined ? String(value) : '')
  }

  return (
    <div className={cn('grid', ANSWER_CONTROL_MAX_WIDTH)}>
      <Input
        {...NUMERIC_TEXT_INPUT_PROPS}
        placeholder="0"
        min={min}
        max={max}
        value={rawValue}
        onChange={(e) => {
          const nextRaw = e.target.value
          setRawValue(nextRaw)
          if (nextRaw === '') {
            onChange?.(undefined)
          } else if (INTEGER_PATTERN.test(nextRaw)) {
            onChange?.(Number(nextRaw))
          }
          // Otherwise (e.g. a lone "-"): keep the local buffer without
          // notifying the parent, since it isn't a complete number yet.
        }}
      />
    </div>
  )
}
