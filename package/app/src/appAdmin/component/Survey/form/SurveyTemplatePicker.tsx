import React, { useMemo, useState } from 'react'

import { ChevronDown, ChevronRight } from 'lucide-react'

import { RadioGroup } from 'component/shadcn/radio-group'
import { Skeleton } from 'component/shadcn/skeleton'

import { useSurveyTemplateList } from '../hook'
import {
  filterSurveyTemplates,
  SURVEY_TEMPLATE_CATEGORY_ALL,
  surveyTemplateCategories,
} from './filterSurveyTemplates'
import { SurveyTemplateFilters } from './SurveyTemplateFilters'
import {
  SurveyTemplateOption,
  SurveyTemplateOptionData,
} from './SurveyTemplateOption'

// Radix radio values must be strings; the blank survey is `undefined` everywhere else.
const BLANK_RADIO_VALUE = '__blank__'

type Props = {
  value: string | undefined
  onChange: (templateId: string | undefined, templateName?: string) => void
}

export const SurveyTemplatePicker: React.FC<Props> = ({ value, onChange }) => {
  const { templates, isLoading } = useSurveyTemplateList()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(SURVEY_TEMPLATE_CATEGORY_ALL)
  const [expanded, setExpanded] = useState(value !== undefined)

  const categories = useMemo(
    () => surveyTemplateCategories(templates),
    [templates],
  )
  const visibleTemplates = useMemo(
    () => filterSurveyTemplates(templates, search, category),
    [templates, search, category],
  )

  const options: SurveyTemplateOptionData[] = [
    {
      id: BLANK_RADIO_VALUE,
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
          <SurveyTemplateFilters
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
          />
          <RadioGroup
            value={value ?? BLANK_RADIO_VALUE}
            onValueChange={(id) =>
              id === BLANK_RADIO_VALUE
                ? onChange(undefined)
                : onChange(
                    id,
                    templates.find((template) => template.id === id)?.name,
                  )
            }
            className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
            data-testid="survey-template-picker"
          >
            {options.map((option) => (
              <SurveyTemplateOption
                key={option.id}
                option={option}
                selected={(value ?? BLANK_RADIO_VALUE) === option.id}
                showCategory={category === SURVEY_TEMPLATE_CATEGORY_ALL}
              />
            ))}
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
