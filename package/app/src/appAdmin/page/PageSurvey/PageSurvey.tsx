import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Plus, Upload, FileText } from 'lucide-react'
import { Survey } from 'veysur-common'

import { usePageTitle, usePagination } from 'hook'
import { useDebounce } from 'common'
import { useFlashMessage } from 'component/FlashMessage'
import { Button } from 'component/shadcn/button'
import { Pagination } from 'component/Pagination'
import { ButtonGroup } from 'component/shadcn/button-group'
import { SectionHeader } from 'component/SectionHeader'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import {
  useSurveyList,
  SurveyListView,
  useSurveyTableColumns,
  useDateFilter,
} from 'appAdmin/component/Survey'
import { useProjectDomain } from 'appAdmin/hook'
import { TimezoneNotice } from 'component/TimezoneNotice'
import { SearchBar } from 'appAdmin/component/SearchBar'
import {
  FilterToolbar,
  FilterFieldConfig,
  FilterValues,
} from 'component/FilterToolbar'
import {
  DateRangeFilter,
  DEFAULT_DATE_RANGE_FILTER,
} from 'component/DateRangeFilter'

export const PageSurvey: React.FC = () => {
  usePageTitle('Surveys', { suffix: 'Veysur Admin' })
  const navigate = useNavigate()
  useFlashMessage({ autoDisplay: true })
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery)
  const pagination = usePagination()
  const { page, perPage, setPage } = pagination
  const dateFilter = useDateFilter()
  const project = useProjectDomain()

  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPage identity is unstable (keyed on react-router's setSearchParams, which changes on every URL update, including pagination clicks); only debouncedSearch/dateRangeFilter should trigger this reset
  }, [debouncedSearch, dateFilter.dateRangeFilter])

  const { surveys, surveyCount, isLoading, isFetching } = useSurveyList(
    debouncedSearch || undefined,
    page,
    perPage,
    dateFilter.dateRangeFilter.startDate || undefined,
    dateFilter.dateRangeFilter.endDate || undefined,
    dateFilter.dateRangeFilter.dateField,
  )

  const columns = useSurveyTableColumns()

  const handleRowClick = (survey: Survey) => {
    navigate(`/survey/${survey._id}/edit`)
  }

  const hasSurveys = (surveys?.length ?? 0) > 0
  const hasActiveFilters =
    !!dateFilter.dateRangeFilter.startDate ||
    !!dateFilter.dateRangeFilter.endDate

  const filterFields: FilterFieldConfig[] = [
    {
      type: 'dateRange',
      key: 'date',
      label: 'Date',
      dateFieldOptions: [
        { value: 'createdAt', label: 'Created Date' },
        { value: 'updatedAt', label: 'Updated Date' },
      ],
      showDateFieldSelector: true,
    },
  ]
  const filterValues: FilterValues = { date: dateFilter.dateRangeFilter }
  const handleFilterApply = (values: FilterValues) => {
    dateFilter.handleDateRangeChange(values.date as DateRangeFilter)
  }
  const handleFilterClear = () => {
    dateFilter.handleDateRangeChange(DEFAULT_DATE_RANGE_FILTER)
  }

  return (
    <AdminPageLayout className="mt-3">
      <SectionHeader
        icon={FileText}
        title="Surveys"
        description="Manage your surveys. Create new surveys, edit existing ones, and track their status."
      >
        <ButtonGroup>
          <Button
            variant="outline"
            size="sm"
            tooltip="Create New Survey"
            asChild
          >
            <Link to="/survey/new">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" tooltip="Import Survey" asChild>
            <Link to="/survey/import">
              <Upload className="h-4 w-4" />
            </Link>
          </Button>
        </ButtonGroup>
      </SectionHeader>
      {(hasSurveys || searchQuery || debouncedSearch || hasActiveFilters) && (
        <div className="flex justify-between items-center gap-3 mt-4">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search surveys by name..."
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
      <div className="mt-4">
        {project?.timezone && (
          <TimezoneNotice
            timezone={project.timezone}
            mode="project"
            className="mb-2"
          />
        )}
        <SurveyListView
          surveys={surveys || []}
          columns={columns}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          isFetching={isFetching}
          isSearching={!!debouncedSearch || hasActiveFilters}
        />
        {hasSurveys && (
          <Pagination total={surveyCount} pagination={pagination} />
        )}
      </div>
    </AdminPageLayout>
  )
}

export default PageSurvey
