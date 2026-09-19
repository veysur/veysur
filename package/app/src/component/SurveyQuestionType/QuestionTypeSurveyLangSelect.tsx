import React from 'react'
import { getLanguageName } from 'veysur-common'

import { cn } from 'common/cn'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import {
  ANSWER_CONTROL_MAX_WIDTH,
  QuestionTypeProps,
} from './QuestionTypeProps'

export const QuestionTypeSurveyLangSelect: React.FC<QuestionTypeProps> = ({
  langOptions = [],
  value = '',
  onChange,
}) => {
  const handleSelectChange = (selectedValue: string) => {
    if (!onChange) return

    if (selectedValue) {
      onChange(selectedValue)
    } else {
      onChange('')
    }
  }

  return (
    <div className={cn('grid', ANSWER_CONTROL_MAX_WIDTH)}>
      <Select value={value} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a language" />
        </SelectTrigger>
        <SelectContent>
          {langOptions.map((code) => (
            <SelectItem key={code} value={code}>
              {getLanguageName(code) || code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
