import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDebounce } from 'common'
import { SurveyResponse } from 'veysur-common'
import { Plus, MessageSquare, Upload, Download } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { ButtonGroup } from 'component/shadcn/button-group'
import { Pagination } from 'component/Pagination'
import { useFlashMessage } from 'component/FlashMessage'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
  SurveyPublicationSelector,
} from 'appAdmin/component/SurveyEditor'
import { useSurveySnapshot } from 'appAdmin/component/SurveySnapshot'
import { usePublicationList } from 'appAdmin/component/SurveyPublication/hook'
import {
  useSurveyResponseList,
  useSurveyResponseDeleteMany,
  useSurveyPageFilters,
  useResponseTableColumns,
  useExportSurveyResponseCsv,
  ResponseDeleteDialog,
  ResponseMassAction,
  ResponseTable,
} from 'appAdmin/component/SurveyResponse'
import { SearchBar } from 'appAdmin/component/SearchBar'
import { TimezoneNotice } from 'component/TimezoneNotice'
import { EmptyState } from 'component/EmptyState'
import { GoldenEmptyState } from 'component/GoldenEmptyState'
import { usePagination } from 'hook'
import { UsageMeter } from 'component/UsageMeter'
import { SectionHeader } from 'component/SectionHeader'
import { useFeatureGate, useProjectDomain } from 'appAdmin/hook'
import { usePageTitle, useSelection } from 'hook'
import {
  FilterToolbar,
  FilterFieldConfig,
  FilterValues,
} from 'component/FilterToolbar'
import {
  DateRangeFilter,
  DEFAULT_DATE_RANGE_FILTER,
} from 'component/DateRangeFilter'

export const PageSurveyEditResponse: React.FC = () => {
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const pagination = usePagination()
  const { page, perPage, setPage } = pagination
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery)

  usePageTitle(`Responses - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })
  React.useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPage identity is unstable (keyed on react-router's setSearchParams, which changes on every URL update, including pagination clicks); only debouncedSearch should trigger this reset
  }, [debouncedSearch])

  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })
  const selection = useSelection()
  const { clearSelection } = selection
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

  const { snapshotData } = useSurveySnapshot(
    survey?._id || '',
    snapshotIdForData,
  )

  const { response, responseCount, isLoading, isFetching } =
    useSurveyResponseList(
      survey?._id || '',
      snapshotIdForData,
      page,
      perPage,
      filters.selectedPublicationId,
      filters.completedFilter,
      filters.dateRangeFilter.startDate,
      filters.dateRangeFilter.endDate,
      filters.dateRangeFilter.dateField,
      debouncedSearch || undefined,
      filters.mergedFilter,
    )

  const { exportResponses, isExporting } = useExportSurveyResponseCsv()

  const { surveyResponseDeleteMany, isLoading: isDeleting } =
    useSurveyResponseDeleteMany(
      survey?._id || '',
      snapshotIdForData,
      filters.selectedPublicationId,
    )

  // Reset selection when page or filters change
  React.useEffect(() => {
    clearSelection()
  }, [
    page,
    filters.selectedPublicationId,
    filters.dateRangeFilter,
    filters.completedFilter,
    filters.mergedFilter,
    debouncedSearch,
    clearSelection,
  ])

  // Table columns
  const { fixedLeftColumns, answerColumns, fixedRightColumns } =
    useResponseTableColumns({
      selection,
      responses: response,
      snapshotData,
      surveyId: survey?._id || '',
      selectedSnapshotId: snapshotIdForData,
    })

  // Event handlers
  const handleRowClick = (response: SurveyResponse) => {
    navigate(`/survey/${survey?._id}/response/${response._id}/view`)
  }

  const handleDelete = async () => {
    try {
      const selectedIds = Array.from(selection.selectedIds)
      const count = selectedIds.length
      await surveyResponseDeleteMany(selectedIds)
      selection.clearSelection()
      setShowDeleteDialog(false)
      showFlashMessage(
        'success',
        `Successfully deleted ${count} response${count !== 1 ? 's' : ''}`,
      )
    } catch (err) {
      console.error('Failed to delete responses:', err)
    }
  }

  const handleExport = () => {
    if (!survey?._id || !filters.selectedPublicationId || !snapshotIdForData)
      return
    exportResponses({
      surveyId: survey._id,
      publicationId: filters.selectedPublicationId,
      snapshotId: snapshotIdForData,
      mergedFilter: filters.mergedFilter,
    })
  }

  const { limits } = useFeatureGate()
  const responsesEntry = limits?.['RESPONSES']
  const project = useProjectDomain()

  const canShowResponses = !!survey?._id && !!filters.selectedPublicationId
  const hasResponses = responseCount > 0

  // Check if any filters are active
  const hasActiveFilters =
    filters.completedFilter === 'completed' ||
    !!filters.dateRangeFilter.startDate ||
    !!filters.dateRangeFilter.endDate ||
    filters.mergedFilter !== 'all'

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
      label: 'Status',
      options: [{ value: 'completed', label: 'Completed Only' }],
      allLabel: 'All Responses',
    },
    {
      type: 'select',
      key: 'merged',
      label: 'Source',
      options: [
        { value: 'merged', label: 'Merged only' },
        { value: 'notMerged', label: 'Not merged' },
      ],
      allLabel: 'All Sources',
    },
  ]
  const filterValues: FilterValues = {
    date: filters.dateRangeFilter,
    completed: filters.completedFilter,
    merged: filters.mergedFilter,
  }
  const handleFilterApply = (values: FilterValues) => {
    filters.handleDateRangeChange(values.date as DateRangeFilter)
    filters.handleCompletedFilterChange(values.completed as 'all' | 'completed')
    filters.handleMergedFilterChange(
      values.merged as 'all' | 'merged' | 'notMerged',
    )
  }
  const handleFilterClear = () => {
    filters.handleDateRangeChange(DEFAULT_DATE_RANGE_FILTER)
    filters.handleCompletedFilterChange('all')
    filters.handleMergedFilterChange('all')
  }

  const handlePublicationChange = (newPublicationId: string) => {
    filters.handlePublicationChange(newPublicationId)
    setPage(1)
  }

  return (
    <div className="h-screen overflow-hidden max-w-full">
      <SurveyEditorNavContainer surveyName={survey?.name}>
        <SurveyPageContent
          showBackButton={false}
          pageHeader={
            <div className="flex items-start justify-between gap-4">
              <SectionHeader
                icon={MessageSquare}
                title="Survey Responses"
                description="View and manage survey responses."
              />
              <ButtonGroup>
                {snapshotIdForData && (
                  <Button
                    variant="outline"
                    size="sm"
                    tooltip="Add Response"
                    asChild
                  >
                    <Link
                      to={`/survey/${survey?._id}/response/snapshot/${snapshotIdForData}/add`}
                    >
                      <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" tooltip="Import" asChild>
                  <Link to={`/survey/${survey?._id}/response/import`}>
                    <Upload className="h-4 w-4" />
                  </Link>
                </Button>
                {hasResponses && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                    tooltip={isExporting ? 'Exporting...' : 'Export'}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </ButtonGroup>
            </div>
          }
        >
          {responsesEntry &&
            !responsesEntry.unlimited &&
            responsesEntry.used != null && (
              <UsageMeter
                label="Responses this billing period"
                used={responsesEntry.used}
                limit={responsesEntry.limit!}
                className="max-w-sm mb-4"
              />
            )}
          <div className="space-y-3 my-3">
            <SurveyPublicationSelector
              surveyId={survey?._id}
              selectedPublicationId={filters.selectedPublicationId}
              onPublicationChange={handlePublicationChange}
              isFetching={isFetching}
            />
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
                <div className="flex items-center gap-3">
                  <FilterToolbar
                    isFetching={isFetching}
                    fields={filterFields}
                    values={filterValues}
                    onApply={handleFilterApply}
                    onClear={handleFilterClear}
                    timezone={project?.timezone}
                  />
                  {canShowResponses && (
                    <ResponseMassAction
                      surveyId={survey?._id || ''}
                      snapshotId={snapshotIdForData}
                      hasSelection={selection.hasSelection}
                      selectionCount={selection.getSelectionCount()}
                      onDelete={() => setShowDeleteDialog(true)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {!isLoading && hasResponses ? (
            <>
              {project?.timezone && (
                <TimezoneNotice
                  timezone={project.timezone}
                  mode="project"
                  className="mb-2"
                />
              )}
              <ResponseTable
                responses={response}
                fixedLeftColumns={fixedLeftColumns}
                answerColumns={answerColumns}
                fixedRightColumns={fixedRightColumns}
                selection={selection}
                onRowClick={handleRowClick}
                isFetching={isFetching}
              />
              <Pagination total={responseCount} pagination={pagination} />
            </>
          ) : isLoading ? (
            <EmptyState isLoading={true} message="" />
          ) : !snapshotIdForData ? (
            <GoldenEmptyState
              icon={MessageSquare}
              title="No responses yet"
              message="Publish your survey and send invitations to start collecting responses."
            />
          ) : (
            <EmptyState
              isLoading={false}
              message={
                debouncedSearch || hasActiveFilters
                  ? 'No responses found matching your search.'
                  : 'No responses found.'
              }
            />
          )}
        </SurveyPageContent>

        <ResponseDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          selectedCount={selection.selectedIds.size}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      </SurveyEditorNavContainer>
    </div>
  )
}

export default PageSurveyEditResponse
