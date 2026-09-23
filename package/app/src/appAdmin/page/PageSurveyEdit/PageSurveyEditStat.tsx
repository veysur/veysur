import React, { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { CompletionStatusFilter } from 'veysur-common'
import { useDebounce } from 'common'

import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
  SurveyPublicationSelector,
} from 'appAdmin/component/SurveyEditor'
import { SurveyLanguageSelector } from 'appAdmin/component/SurveyEditor/SurveyLanguageSelector'
import { PageHeader } from 'component/PageHeader'
import { usePageTitle } from 'hook'
import {
  SurveyStatContainer,
  useSurveyStats,
} from 'appAdmin/component/SurveyStat'
import { usePublicationList } from 'appAdmin/component/SurveyPublication/hook'
import { useProjectDomain } from 'appAdmin/hook'
import { useSurveyPageFilters } from 'appAdmin/component/SurveyResponse'
import { COMPLETION_STATUS_FILTER_OPTIONS } from 'appAdmin/component/SurveyParticipant'
import { SearchBar } from 'appAdmin/component/SearchBar'
import { EmptyState } from 'component/EmptyState'
import { GoldenEmptyState } from 'component/GoldenEmptyState'
import {
  FilterToolbar,
  FilterFieldConfig,
  FilterValues,
} from 'component/FilterToolbar'
import {
  DateRangeFilter,
  DEFAULT_DATE_RANGE_FILTER,
} from 'component/DateRangeFilter'

export const PageSurveyEditStat: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const langEditing = useSurveyEditorStore((state) => state.langEditing)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery)
  const project = useProjectDomain()

  usePageTitle(`Statistics - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { publications } = usePublicationList({
    surveyId: survey?._id,
    perPage: 100,
  })

  const filters = useSurveyPageFilters({
    publications,
    enableDateFilter: true,
    enableCompletedFilter: true,
  })

  const snapshotIdForData = filters.getSnapshotIdForData()

  const { stats, isLoading, isFetching } = useSurveyStats(
    survey?._id || '',
    snapshotIdForData,
    filters.selectedPublicationId,
    filters.completedFilter,
    filters.dateRangeFilter.startDate,
    filters.dateRangeFilter.endDate,
    filters.dateRangeFilter.dateField,
    debouncedSearch || undefined,
  )

  const hasResponses = (stats?.totalResponses ?? 0) > 0

  const hasActiveFilters =
    filters.completedFilter !== 'all' ||
    !!filters.dateRangeFilter.startDate ||
    !!filters.dateRangeFilter.endDate

  const filterFields: FilterFieldConfig[] = [
    {
      type: 'dateRange',
      key: 'date',
      label: 'Date',
      showDateFieldSelector: false,
    },
    {
      type: 'select',
      key: 'completed',
      label: 'Completion status',
      options: COMPLETION_STATUS_FILTER_OPTIONS,
      allLabel: 'All statuses',
    },
  ]
  const filterValues: FilterValues = {
    date: filters.dateRangeFilter,
    completed: filters.completedFilter,
  }
  const handleFilterApply = (values: FilterValues) => {
    filters.handleDateRangeChange(values.date as DateRangeFilter)
    filters.handleCompletedFilterChange(
      values.completed as CompletionStatusFilter,
    )
  }
  const handleFilterClear = () => {
    filters.handleDateRangeChange(DEFAULT_DATE_RANGE_FILTER)
    filters.handleCompletedFilterChange('all')
  }

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        showBackButton={false}
        pageHeader={
          <PageHeader
            icon={BarChart3}
            title="Survey Statistics"
            description="View survey response statistics and analytics."
            maxWidth="max-w-none"
            showBack={false}
          />
        }
      >
        <div className="my-3">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <SurveyPublicationSelector
                surveyId={survey?._id}
                selectedPublicationId={filters.selectedPublicationId}
                onPublicationChange={filters.handlePublicationChange}
                isFetching={isFetching}
              />
              <SurveyLanguageSelector />
            </div>
            {(hasResponses ||
              searchQuery ||
              debouncedSearch ||
              hasActiveFilters) && (
              <div className="flex justify-between items-center gap-3">
                <SearchBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  placeholder="Search by Response ID, Name, or Email..."
                />
                <FilterToolbar
                  isFetching={isFetching}
                  fields={filterFields}
                  values={filterValues}
                  onApply={handleFilterApply}
                  onClear={handleFilterClear}
                  timezone={project?.timezone}
                />
              </div>
            )}
          </div>
        </div>

        {!isLoading && hasResponses ? (
          <SurveyStatContainer
            stats={stats}
            isLoading={isLoading}
            isFetching={isFetching}
            language={langEditing || survey?.language?.default || 'en'}
          />
        ) : isLoading ? (
          <EmptyState isLoading={true} message="" />
        ) : !snapshotIdForData ? (
          <GoldenEmptyState
            icon={BarChart3}
            title="No statistics yet"
            message="Statistics will appear here once your survey has been published and responses collected."
          />
        ) : (
          <EmptyState
            isLoading={false}
            message={
              debouncedSearch
                ? 'No responses found matching your search.'
                : 'No responses found.'
            }
          />
        )}
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditStat
