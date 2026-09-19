import React, { useMemo } from 'react'

import { cn } from 'common/cn'
import { Input } from 'component/shadcn/input'
import { Textarea } from 'component/shadcn/textarea'
import {
  ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
  ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM,
  ATTRIBUTE_TEXT_INPUT_SIZE_LARGE,
  MinMax,
} from 'veysur-common'

import {
  ANSWER_CONTROL_MAX_WIDTH,
  QuestionTypeProps,
} from './QuestionTypeProps'

export const QuestionTypeText: React.FC<QuestionTypeProps> = ({
  question,
  value,
  onChange,
}) => {
  const inputSize = useMemo(
    () => question?.attributes?.inputSize || ATTRIBUTE_TEXT_INPUT_SIZE_SMALL,
    [question?.attributes?.inputSize],
  )
  const lengthMinMax = question?.attributes?.lengthMinMax as
    Partial<MinMax> | undefined

  let rows = 1
  switch (inputSize) {
    case ATTRIBUTE_TEXT_INPUT_SIZE_MEDIUM:
      rows = 6
      break
    case ATTRIBUTE_TEXT_INPUT_SIZE_LARGE:
      rows = 14
      break
    default:
  }

  const isTextarea = inputSize !== ATTRIBUTE_TEXT_INPUT_SIZE_SMALL

  return (
    <div className={cn('grid', ANSWER_CONTROL_MAX_WIDTH)}>
      {isTextarea ? (
        <Textarea
          rows={rows}
          placeholder="Type your answer here"
          minLength={lengthMinMax?.min || undefined}
          maxLength={lengthMinMax?.max || undefined}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <Input
          placeholder="Type your answer here"
          minLength={lengthMinMax?.min || undefined}
          maxLength={lengthMinMax?.max || undefined}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  )
}
