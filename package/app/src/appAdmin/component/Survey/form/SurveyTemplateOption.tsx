import React from 'react'

import { Badge } from 'component/shadcn/badge'
import { Label } from 'component/shadcn/label'
import { RadioGroupItem } from 'component/shadcn/radio-group'
import { cn } from '@/common/cn'

export type SurveyTemplateOptionData = {
  id: string
  name: string
  detail: string
  category?: string
}

type Props = {
  option: SurveyTemplateOptionData
  selected: boolean
  showCategory: boolean
}

export const SurveyTemplateOption: React.FC<Props> = ({
  option,
  selected,
  showCategory,
}) => {
  const inputId = `survey-template-${option.id}`
  return (
    <Label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal hover:bg-accent',
        selected && 'border-primary bg-accent',
      )}
    >
      <RadioGroupItem id={inputId} value={option.id} className="mt-1" />
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="font-medium">{option.name}</span>
          {option.category && showCategory && (
            <Badge variant="secondary">{option.category}</Badge>
          )}
        </span>
        <span className="text-sm text-muted-foreground">{option.detail}</span>
      </span>
    </Label>
  )
}
