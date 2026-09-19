import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { SurveyParticipant, CompletionStatusFilter } from 'veysur-common'

import { usePagination, usePageTitle, useSelection } from 'hook'
import { useDebounce } from 'common'
import { useFlashMessage } from 'component/FlashMessage'
import { Button } from 'component/shadcn/button'
import { EmptyState } from 'component/EmptyState'
import { GoldenEmptyState } from 'component/GoldenEmptyState'
import { SurveyNotPublishedAlert } from 'component/SurveyNotPublishedAlert'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  usePublished,
  SurveyEditorPublish,
} from 'appAdmin/component/SurveyEditorPublish'
import {
  useSurveyParticipantListPaginated,
  useSurveyParticipantDeleteMany,
  useSurveyParticipantResetInviteStatusMany,
  useSurveyParticipantResetReminderStatusMany,
  useSurveyParticipantExport,
  ParticipantPageHeader,
  ParticipantMassAction,
  ParticipantListView,
  ParticipantDeleteDialog,
  ParticipantResetInviteStatusDialog,
  ParticipantResetReminderStatusDialog,
  ParticipantExportDialog,
  SendInvitesDialog,
  SendRemindersDialog,
  useParticipantTableColumns,
} from 'appAdmin/component/SurveyParticipant'
import { useDisplayTimezone } from 'appAdmin/hook'
import { TimezoneNotice } from 'component/TimezoneNotice'

export const PageSurveyEditParticipant: React.FC = () => {
  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })

  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const { isPublished, isLoading: isLoadingPublished } = usePublished({
    surveyId: survey?._id,
  })
  const pagination = usePagination()
  const { page, perPage, setPage } = pagination
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery)
  const [completionStatus, setCompletionStatus] =
    useState<CompletionStatusFilter>('all')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showResetInviteStatusDialog, setShowResetInviteStatusDialog] =
    useState(false)
  const [showResetReminderStatusDialog, setShowResetReminderStatusDialog] =
    useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSendInvitesDialog, setShowSendInvitesDialog] = useState(false)
  const [showSendRemindersDialog, setShowSendRemindersDialog] = useState(false)
  const selection = useSelection()
  const { clearSelection } = selection

  const { surveyParticipantDeleteMany, isLoading: isDeleting } =
    useSurveyParticipantDeleteMany(survey?._id || '')

  const {
    surveyParticipantResetInviteStatusMany,
    isLoading: isResettingInviteStatus,
  } = useSurveyParticipantResetInviteStatusMany(survey?._id || '')

  const {
    surveyParticipantResetReminderStatusMany,
    isLoading: isResettingReminderStatus,
  } = useSurveyParticipantResetReminderStatusMany(survey?._id || '')

  const { exportParticipants, isExporting } = useSurveyParticipantExport(
    survey?._id || '',
  )

  useEffect(() => {
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setPage identity is unstable (keyed on react-router's setSearchParams, which changes on every URL update, including pagination clicks); only debouncedSearch/completionStatus should trigger this reset
  }, [debouncedSearch, completionStatus])

  useEffect(() => {
    clearSelection()
  }, [debouncedSearch, completionStatus, page, clearSelection])

  usePageTitle(`Participants - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { participants, participantCount, isLoading, isFetching } =
    useSurveyParticipantListPaginated({
      surveyId: survey?._id,
      page,
      perPage,
      search: debouncedSearch || undefined,
      completionStatus:
        completionStatus === 'all' ? undefined : completionStatus,
    })

  const columns = useParticipantTableColumns(survey?._id || '', isPublished)
  const tz = useDisplayTimezone()

  const handleRowClick = (participant: SurveyParticipant) => {
    navigate(`/survey/${survey?._id}/participant/${participant._id}/edit`)
  }

  const handleDelete = async () => {
    try {
      const selectedIds = Array.from(selection.selectedIds)
      const count = selectedIds.length
      await surveyParticipantDeleteMany(selectedIds)
      selection.clearSelection()
      setShowDeleteDialog(false)
      showFlashMessage(
        'success',
        `Successfully deleted ${count} participant${count !== 1 ? 's' : ''}`,
      )
    } catch (err) {
      console.error('Failed to delete participants:', err)
    }
  }

  const handleResetInviteStatus = async () => {
    try {
      const selectedIds = Array.from(selection.selectedIds)
      const count = selectedIds.length
      await surveyParticipantResetInviteStatusMany(selectedIds)
      selection.clearSelection()
      setShowResetInviteStatusDialog(false)
      showFlashMessage(
        'success',
        `Successfully reset invite status for ${count} participant${count !== 1 ? 's' : ''}`,
      )
    } catch (err) {
      console.error('Failed to reset invite status:', err)
    }
  }

  const handleResetReminderStatus = async () => {
    try {
      const selectedIds = Array.from(selection.selectedIds)
      const count = selectedIds.length
      await surveyParticipantResetReminderStatusMany(selectedIds)
      selection.clearSelection()
      setShowResetReminderStatusDialog(false)
      showFlashMessage(
        'success',
        `Successfully reset reminder status for ${count} participant${count !== 1 ? 's' : ''}`,
      )
    } catch (err) {
      console.error('Failed to reset reminder status:', err)
    }
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleExportConfirm = async () => {
    try {
      await exportParticipants(undefined)
      setShowExportDialog(false)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleSendInvites = () => {
    setShowSendInvitesDialog(true)
  }

  const handleSendReminders = () => {
    setShowSendRemindersDialog(true)
  }

  const hasParticipants = participantCount > 0

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        showBackButton={false}
        pageHeader={
          <ParticipantPageHeader
            surveyId={survey?._id || ''}
            hasParticipants={hasParticipants}
            onExport={handleExport}
            isExporting={isExporting}
            onSendInvites={handleSendInvites}
            isSendingInvites={false}
            onSendReminders={handleSendReminders}
            isSendingReminders={false}
          />
        }
      >
        {survey?._id && !isLoadingPublished && !isPublished && (
          <SurveyNotPublishedAlert
            surveyId={survey._id}
            className="mb-4 max-w-2xl mx-auto"
            publishAction={<SurveyEditorPublish />}
          />
        )}

        <ParticipantMassAction
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          completionStatus={completionStatus}
          onCompletionStatusChange={setCompletionStatus}
          isFetching={isFetching}
          selection={selection}
          onDeleteClick={() => setShowDeleteDialog(true)}
          onResetInviteStatusClick={() => setShowResetInviteStatusDialog(true)}
          onResetReminderStatusClick={() =>
            setShowResetReminderStatusDialog(true)
          }
          hasParticipants={hasParticipants}
        />

        {!isLoading && !hasParticipants ? (
          debouncedSearch || completionStatus !== 'all' ? (
            <EmptyState
              isLoading={false}
              message="No participants found matching your search."
            />
          ) : (
            <GoldenEmptyState
              icon={Users}
              title="No participants yet"
              message="Add participants to start sending survey invitations."
              topOffset={!isPublished ? '15rem' : '11rem'}
              action={
                <Button asChild>
                  <Link to={`/survey/${survey?._id}/participant/add`}>
                    Add Participant
                  </Link>
                </Button>
              }
            />
          )
        ) : (
          <>
            {tz && (
              <TimezoneNotice timezone={tz} mode="project" className="mb-2" />
            )}
            <ParticipantListView
              participants={participants}
              columns={columns}
              participantCount={participantCount}
              pagination={pagination}
              selection={selection}
              onRowClick={handleRowClick}
              isLoading={isLoading}
              isFetching={isFetching}
            />
          </>
        )}
      </SurveyPageContent>

      <ParticipantDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        selectedCount={selection.selectedIds.size}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <ParticipantResetInviteStatusDialog
        open={showResetInviteStatusDialog}
        onOpenChange={setShowResetInviteStatusDialog}
        selectedCount={selection.selectedIds.size}
        onConfirm={handleResetInviteStatus}
        isResetting={isResettingInviteStatus}
      />

      <ParticipantResetReminderStatusDialog
        open={showResetReminderStatusDialog}
        onOpenChange={setShowResetReminderStatusDialog}
        selectedCount={selection.selectedIds.size}
        onConfirm={handleResetReminderStatus}
        isResetting={isResettingReminderStatus}
      />

      <ParticipantExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onConfirm={handleExportConfirm}
        isExporting={isExporting}
      />

      <SendInvitesDialog
        key={`send-invites-${showSendInvitesDialog ? 'open' : 'closed'}`}
        open={showSendInvitesDialog}
        onOpenChange={setShowSendInvitesDialog}
        surveyId={survey?._id || ''}
      />

      <SendRemindersDialog
        key={`send-reminders-${showSendRemindersDialog ? 'open' : 'closed'}`}
        open={showSendRemindersDialog}
        onOpenChange={setShowSendRemindersDialog}
        surveyId={survey?._id || ''}
      />
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditParticipant
