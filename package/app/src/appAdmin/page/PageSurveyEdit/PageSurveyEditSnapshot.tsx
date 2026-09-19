import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SurveySnapshotPartial } from 'veysur-common'
import { Camera } from 'lucide-react'

import { formatCalendar } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

import { DataTable } from 'component/DataTable'
import type { ColumnDefinition } from 'component/DataTable'
import { Pagination } from 'component/Pagination'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  useSurveySnapshotList,
  useSurveySnapshotDeleteMany,
  SurveySnapshotActionDropdown,
  SnapshotPublicationsCell,
  SnapshotActionsDropdown,
  SnapshotDeleteDialog,
} from 'appAdmin/component/SurveySnapshot'
import { usePagination } from 'hook'
import { usePageTitle, useSelection } from 'hook'
import { SectionHeader } from 'component/SectionHeader'

export const PageSurveyEditSnapshot: React.FC = () => {
  const navigate = useNavigate()
  const tz = useDisplayTimezone()
  const survey = useSurveyEditorStore((state) => state.survey)
  const pagination = usePagination()
  const { page, perPage } = pagination
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const selection = useSelection()
  const { clearSelection } = selection

  const handleRowClick = (snapshot: SurveySnapshotPartial) => {
    navigate(
      `/survey/${survey?._id}/response/snapshot/${snapshot._id}?filterMode=snapshot`,
    )
  }

  usePageTitle(`Snapshots - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { snapshots, snapshotCount, isLoading, isFetching } =
    useSurveySnapshotList({
      surveyId: survey?._id,
      page,
      perPage,
    })

  const { surveySnapshotDeleteMany, isLoading: isDeleting } =
    useSurveySnapshotDeleteMany(survey?._id || '')

  // Reset selection when page changes
  React.useEffect(() => {
    clearSelection()
  }, [page, clearSelection])

  const handleDelete = async () => {
    try {
      await surveySnapshotDeleteMany(Array.from(selection.selectedIds))
      selection.clearSelection()
      setShowDeleteDialog(false)
    } catch (err) {
      console.error('Failed to delete snapshots:', err)
    }
  }

  const columns: ColumnDefinition<SurveySnapshotPartial>[] = [
    {
      key: 'snapshotId',
      title: 'Snapshot ID',
      render: (snapshot) => snapshot._id.slice(-8),
    },
    {
      key: 'label',
      title: 'Label',
      render: (snapshot) =>
        snapshot.label || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'created',
      title: 'Created',
      render: (snapshot) => formatCalendar(snapshot.createdAt, tz),
    },
    {
      key: 'publications',
      title: 'Publications',
      render: (snapshot) => (
        <SnapshotPublicationsCell
          snapshot={snapshot}
          surveyId={survey?._id || ''}
        />
      ),
    },
    {
      key: 'responses',
      title: 'Responses',
      render: (snapshot) => snapshot.responseCount ?? 0,
    },
    {
      key: 'actions',
      title: '',
      render: (snapshot) => (
        <SurveySnapshotActionDropdown
          snapshot={snapshot}
          surveyId={survey?._id || ''}
        />
      ),
      className: 'action-menu text-end',
    },
  ]

  const hasSnapshots = snapshotCount > 0

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        showBackButton={false}
        pageHeader={
          <SectionHeader
            icon={Camera}
            title="Survey Snapshots"
            description="View and manage published snapshots of your survey. Each snapshot represents a version of your survey at a specific point in time."
          />
        }
      >
        <div className="flex justify-between items-center my-3">
          <div>
            {isFetching && !isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            )}
          </div>
          {hasSnapshots && (
            <SnapshotActionsDropdown
              hasSelection={selection.hasSelection}
              selectionCount={selection.getSelectionCount()}
              onDelete={() => setShowDeleteDialog(true)}
            />
          )}
        </div>

        <DataTable
          data={snapshots}
          columns={columns}
          getRowId={(snapshot) => snapshot._id}
          enableSelection
          selection={selection}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          isFetching={isFetching}
          preventClickKeys={['select', 'actions', 'publications']}
          emptyState={
            <div className="text-center py-5">
              <p className="text-muted-foreground">
                No snapshots found. Publish your survey to create a snapshot.
              </p>
            </div>
          }
        />

        {hasSnapshots && (
          <Pagination total={snapshotCount} pagination={pagination} />
        )}
      </SurveyPageContent>

      <SnapshotDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        selectedCount={selection.selectedIds.size}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditSnapshot
