import React from 'react'

import { SearchBar } from 'appAdmin/component/SearchBar'
import { Tabs, TabsList, TabsTrigger } from 'component/shadcn/tabs'

import { SURVEY_TEMPLATE_CATEGORY_ALL } from './filterSurveyTemplates'

type Props = {
  search: string
  onSearchChange: (search: string) => void
  category: string
  onCategoryChange: (category: string) => void
  categories: string[]
}

export const SurveyTemplateFilters: React.FC<Props> = ({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
}) => (
  <div
    className="mb-3 flex flex-col gap-2"
    onKeyDown={(e) => {
      if (e.key === 'Enter') e.preventDefault()
    }}
  >
    <SearchBar
      searchQuery={search}
      onSearchChange={onSearchChange}
      placeholder="Search templates (optional)..."
      className="w-full"
    />
    {categories.length > 0 && (
      <Tabs value={category} onValueChange={onCategoryChange}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value={SURVEY_TEMPLATE_CATEGORY_ALL}>All</TabsTrigger>
          {categories.map((name) => (
            <TabsTrigger key={name} value={name}>
              {name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    )}
  </div>
)
