import React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Plus } from 'lucide-react'
import { Survey } from 'veysur-common'
import { DataTable } from 'component/DataTable'
import type { ColumnDefinition } from 'component/DataTable'
import { EmptyState } from 'component/EmptyState'
import { GoldenEmptyState } from 'component/GoldenEmptyState'
import { Button } from 'component/shadcn/button'

interface SurveyListViewProps {
  surveys: Survey[]
  columns: ColumnDefinition<Survey>[]
  onRowClick: (survey: Survey) => void
  isLoading: boolean
  isFetching: boolean
  isSearching?: boolean
}

export const SurveyListView: React.FC<SurveyListViewProps> = ({
  surveys,
  columns,
  onRowClick,
  isLoading,
  isFetching,
  isSearching = false,
}) => {
  const hasSurveys = (surveys?.length ?? 0) > 0

  if (!isLoading && !hasSurveys) {
    if (isSearching) {
      return (
        <EmptyState
          isLoading={false}
          message="No surveys found matching your search."
        />
      )
    }

    return (
      <GoldenEmptyState
        icon={ClipboardList}
        title="Create your first survey"
        message="See what's possible. It all starts with a question. Build your survey."
        action={
          <Button asChild>
            <Link to="/survey/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Survey
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <DataTable
      data={surveys}
      columns={columns}
      getRowId={(survey) => survey._id}
      onRowClick={onRowClick}
      isLoading={isLoading}
      isFetching={isFetching}
    />
  )
}
