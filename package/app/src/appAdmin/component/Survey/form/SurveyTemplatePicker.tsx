import React from 'react'

import { Label } from 'component/shadcn/label'
import { RadioGroup, RadioGroupItem } from 'component/shadcn/radio-group'
import { Skeleton } from 'component/shadcn/skeleton'
import { cn } from '@/common/cn'

import { useSurveyTemplateList } from '../hook'

export const SURVEY_TEMPLATE_BLANK = 'blank'

type Props = {
  value: string
  onChange: (templateId: string) => void
}

type Option = { id: string; name: string; detail: string }

export const SurveyTemplatePicker: React.FC<Props> = ({ value, onChange }) => {
  const { templates, isLoading } = useSurveyTemplateList()

  const options: Option[] = [
    {
      id: SURVEY_TEMPLATE_BLANK,
      name: 'Blank survey',
      detail: 'Start with an empty survey and add your own questions.',
    },
    ...templates.map((template) => ({
      id: template.id,
      name: template.name,
      detail: `${template.description} (${template.questionCount} questions)`,
    })),
  ]

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium leading-none">
        Start from
      </legend>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="grid gap-2 sm:grid-cols-2"
        data-testid="survey-template-picker"
      >
        {options.map((option) => {
          const inputId = `survey-template-${option.id}`
          return (
            <Label
              key={option.id}
              htmlFor={inputId}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border p-3 font-normal hover:bg-accent',
                value === option.id && 'border-primary bg-accent',
              )}
            >
              <RadioGroupItem id={inputId} value={option.id} className="mt-1" />
              <span className="flex flex-col gap-1">
                <span className="font-medium">{option.name}</span>
                <span className="text-sm text-muted-foreground">
                  {option.detail}
                </span>
              </span>
            </Label>
          )
        })}
        {isLoading && <Skeleton className="h-20 w-full" />}
      </RadioGroup>
    </fieldset>
  )
}
