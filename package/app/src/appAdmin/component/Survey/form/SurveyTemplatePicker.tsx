import React, { useMemo, useState } from 'react'

import { ChevronDown, ChevronRight } from 'lucide-react'

import { SearchBar } from 'appAdmin/component/SearchBar'
import { Badge } from 'component/shadcn/badge'
import { Label } from 'component/shadcn/label'
import { RadioGroup, RadioGroupItem } from 'component/shadcn/radio-group'
import { Skeleton } from 'component/shadcn/skeleton'
import { Tabs, TabsList, TabsTrigger } from 'component/shadcn/tabs'
import { cn } from '@/common/cn'

import { useSurveyTemplateList } from '../hook'
import {
  filterSurveyTemplates,
  SURVEY_TEMPLATE_CATEGORY_ALL,
  surveyTemplateCategories,
} from './filterSurveyTemplates'

export const SURVEY_TEMPLATE_BLANK = 'blank'

type Props = {
  value: string
  onChange: (templateId: string) => void
}

type Option = { id: string; name: string; detail: string; category?: string }

export const SurveyTemplatePicker: React.FC<Props> = ({ value, onChange }) => {
  const { templates, isLoading } = useSurveyTemplateList()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(SURVEY_TEMPLATE_CATEGORY_ALL)
  const [expanded, setExpanded] = useState(value !== SURVEY_TEMPLATE_BLANK)

  const categories = useMemo(
    () => surveyTemplateCategories(templates),
    [templates],
  )
  const visibleTemplates = useMemo(
    () => filterSurveyTemplates(templates, search, category),
    [templates, search, category],
  )

  const options: Option[] = [
    {
      id: SURVEY_TEMPLATE_BLANK,
      name: 'Blank survey',
      detail: 'Start with an empty survey and add your own questions.',
    },
    ...visibleTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      detail: `${template.description} (${template.questionCount} questions)`,
      category: template.category,
    })),
  ]

  const selectedTemplate = templates.find((template) => template.id === value)
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <fieldset>
      <legend className="sr-only">Start from a template</legend>
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        data-testid="survey-template-toggle"
      >
        <Chevron className="size-4" aria-hidden />
        Start from a template{' '}
        <span className="font-normal text-muted-foreground">
          {selectedTemplate ? `(${selectedTemplate.name})` : '(optional)'}
        </span>
      </button>
      {expanded && (
        <div className="mt-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Choose a category or search to find a template, or keep the blank
            survey. You can change everything once the survey is created.
          </p>
          <div
            className="mb-3 flex flex-col gap-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
            }}
          >
            <SearchBar
              searchQuery={search}
              onSearchChange={setSearch}
              placeholder="Search templates (optional)..."
              className="w-full"
            />
            {categories.length > 0 && (
              <Tabs value={category} onValueChange={setCategory}>
                <TabsList className="h-auto flex-wrap justify-start">
                  <TabsTrigger value={SURVEY_TEMPLATE_CATEGORY_ALL}>
                    All
                  </TabsTrigger>
                  {categories.map((name) => (
                    <TabsTrigger key={name} value={name}>
                      {name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>
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
                  <RadioGroupItem
                    id={inputId}
                    value={option.id}
                    className="mt-1"
                  />
                  <span className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{option.name}</span>
                      {option.category &&
                        category === SURVEY_TEMPLATE_CATEGORY_ALL && (
                          <Badge variant="secondary">{option.category}</Badge>
                        )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {option.detail}
                    </span>
                  </span>
                </Label>
              )
            })}
            {isLoading && <Skeleton className="h-20 w-full" />}
          </RadioGroup>
          {!isLoading &&
            templates.length > 0 &&
            visibleTemplates.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                No templates match your search.
              </p>
            )}
        </div>
      )}
    </fieldset>
  )
}
