import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SurveyPublication } from 'veysur-common'
import momentTimezone from 'moment-timezone'
import { BookOpen, Camera, Upload } from 'lucide-react'

import { cn } from 'common/cn'
import { formatCalendar } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'
import { DataTable } from 'component/DataTable'
import type { ColumnDefinition } from 'component/DataTable'
import { Pagination } from 'component/Pagination'
import { useFlashMessage } from 'component/FlashMessage'
import { Button } from 'component/shadcn/button'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import { SurveyEditorPublish } from 'appAdmin/component/SurveyEditorPublish'
import { useSurveySnapshotList } from 'appAdmin/component/SurveySnapshot'
import {
  usePublicationList,
  usePublicationDeleteMany,
  PublicationRowAction,
  PublicationMassAction,
  PublicationDeleteDialog,
} from 'appAdmin/component/SurveyPublication'
import { usePagination } from 'hook'
import { usePageTitle, useSelection } from 'hook'
import { PageHeader } from 'component/PageHeader'
import { EmptyState } from 'component/EmptyState'
import { GoldenEmptyState } from 'component/GoldenEmptyState'

export const PageSurveyEditPublication: React.FC = () => {
  const navigate = useNavigate()
  const tz = useDisplayTimezone()
  const survey = useSurveyEditorStore((state) => state.survey)
  const pagination = usePagination()
  const { page, perPage } = pagination
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const selection = useSelection()
  const { clearSelection } = selection
  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })

  usePageTitle(`Publications - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { snapshots } = useSurveySnapshotList({
    surveyId: survey?._id,
  })

  const { publications, publicationCount, isLoading, isFetching } =
    usePublicationList({
      surveyId: survey?._id,
      page,
      perPage,
    })

  const { publicationDeleteMany, isLoading: isDeleting } =
    usePublicationDeleteMany(survey?._id || '')

  const selectedIncludesActive = React.useMemo(
    () =>
      publications.some(
        (publication) =>
          selection.selectedIds.has(publication._id) && !publication.stoppedAt,
      ),
    [publications, selection.selectedIds],
  )

  // Reset selection when page changes
  React.useEffect(() => {
    clearSelection()
  }, [page, clearSelection])

  const handleDelete = async () => {
    try {
      const selectedIds = Array.from(selection.selectedIds)
      const count = selectedIds.length
      await publicationDeleteMany(selectedIds)
      selection.clearSelection()
      setShowDeleteDialog(false)
      showFlashMessage(
        'success',
        `Successfully deleted ${count} publication${count !== 1 ? 's' : ''}`,
      )
    } catch (err) {
      console.error('Failed to delete publications:', err)
    }
  }

  const handleRowClick = (publication: SurveyPublication) => {
    navigate(`/survey/${survey?._id}/response?publicationId=${publication._id}`)
  }

  const columns: ColumnDefinition<SurveyPublication>[] = [
    {
      key: 'publicationId',
      title: 'Publication ID',
      render: (publication) => publication._id.slice(-8),
    },
    {
      key: 'snapshotId',
      title: 'Snapshot ID',
      render: (publication) => {
        const snapshot = snapshots.find((s) => s._id === publication.snapshotId)
        const snapshotLabel = snapshot?.label ? ` (${snapshot.label})` : ''
        return (
          <span>
            {publication.snapshotId.slice(-8)}
            {snapshotLabel && (
              <span className="text-muted-foreground ml-1">
                {snapshotLabel}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'label',
      title: 'Label',
      render: (publication) =>
        publication.label || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'published',
      title: 'Published',
      render: (publication) => formatCalendar(publication.publishedAt, tz),
    },
    {
      key: 'stopped',
      title: 'Stopped',
      render: (publication) =>
        publication.stoppedAt ? (
          formatCalendar(publication.stoppedAt, tz)
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'active',
      title: 'Active',
      render: (publication) => {
        if (!publication.stoppedAt) {
          return <span className="text-muted-foreground">-</span>
        }
        const duration = momentTimezone(publication.stoppedAt).diff(
          momentTimezone(publication.publishedAt),
        )
        return momentTimezone.duration(duration).humanize()
      },
    },
    {
      key: 'responses',
      title: 'Responses',
      render: (publication) => publication.responseCount ?? 0,
    },
    {
      key: 'status',
      title: 'Status',
      render: (publication) => {
        const isActive = !publication.stoppedAt
        return (
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              isActive
                ? 'bg-success/10 text-success'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isActive ? 'Published' : 'Stopped'}
          </span>
        )
      },
    },
    {
      key: 'actions',
      title: '',
      render: (publication) => (
        <PublicationRowAction
          publication={publication}
          surveyId={survey?._id || ''}
        />
      ),
      className: 'action-menu text-end',
    },
  ]

  const hasPublications = publicationCount > 0

  return (
    <SurveyEditorNavContainer
      surveyName={survey?.name}
      headerActions={<SurveyEditorPublish />}
    >
      <SurveyPageContent
        showBackButton={false}
        pageHeader={
          <PageHeader
            icon={BookOpen}
            title="Survey Publications"
            description="View and manage publication history of your survey. Each publication represents when a survey was made available to participants."
            maxWidth="max-w-none"
            showBack={false}
            inlineNav={
              <>
                <Button
                  className="hidden"
                  variant="outline"
                  size="sm"
                  tooltip="Snapshots"
                  onClick={() => navigate(`/survey/${survey?._id}/snapshot`)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/survey/${survey?._id}/publication/import`)
                  }
                  tooltip="Import Publication"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </>
            }
          />
        }
      >
        {!isLoading && hasPublications ? (
          <>
            <div className="flex justify-end items-center gap-3 mt-4">
              {hasPublications && (
                <PublicationMassAction
                  hasSelection={selection.hasSelection}
                  selectionCount={selection.getSelectionCount()}
                  onDelete={() => setShowDeleteDialog(true)}
                />
              )}
            </div>
            <DataTable
              data={publications}
              columns={columns}
              getRowId={(publication) => publication._id}
              enableSelection
              selection={selection}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              isFetching={isFetching}
              containerClassName="mt-4 border-0 rounded-none"
            />
            <Pagination total={publicationCount} pagination={pagination} />
          </>
        ) : isLoading ? (
          <EmptyState isLoading={true} message="" />
        ) : (
          <GoldenEmptyState
            icon={BookOpen}
            title="No publications yet"
            message="Publish your survey to make it available to participants and start collecting responses."
          />
        )}
      </SurveyPageContent>

      <PublicationDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        selectedCount={selection.selectedIds.size}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        includesActivePublication={selectedIncludesActive}
      />
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditPublication
