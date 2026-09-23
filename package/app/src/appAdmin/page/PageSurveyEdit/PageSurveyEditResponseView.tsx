import React, { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { Skeleton } from 'component/shadcn/skeleton'
import { Accordion } from 'component/shadcn/accordion'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { useFlashMessage } from 'component/FlashMessage'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  useSurveyResponseGet,
  useSurveyResponseDelete,
  useResponseFiles,
} from 'appAdmin/component/SurveyResponse'
import {
  ResponseViewHeader,
  ParticipantInfoSection,
  ResponseDetailsSection,
  PublicationInfoSection,
  SnapshotInfoSection,
  AnswersSection,
  DeleteResponseDialog,
} from 'appAdmin/component/SurveyResponse/view'
import { useSurveySnapshot } from 'appAdmin/component/SurveySnapshot'
import { usePageTitle } from 'hook'

export const PageSurveyEditResponseView: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { responseId } = useParams<{
    responseId: string
  }>()
  const survey = useSurveyEditorStore((state) => state.survey)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  usePageTitle(`View Response - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { setFlashMessage } = useFlashMessage({ autoDisplay: true })

  const { response, isLoading, error } = useSurveyResponseGet(
    survey?._id || '',
    responseId || '',
  )

  // Get snapshotId from response for loading snapshot data and navigation
  const snapshotId = response?.snapshotId

  const { snapshotData } = useSurveySnapshot(
    survey?._id || '',
    snapshotId || '',
  )

  const { files: responseFiles } = useResponseFiles(
    survey?._id || '',
    responseId || '',
  )

  const { surveyResponseDelete } = useSurveyResponseDelete(
    survey?._id || '',
    snapshotId || '',
    response?.publicationId,
  )

  const handleBack = () => {
    // Preserve publicationId query param when navigating back
    const publicationId = searchParams.get('publicationId')
    const queryString = publicationId ? `?publicationId=${publicationId}` : ''
    navigate(`/survey/${survey?._id}/response${queryString}`)
  }

  const handleEdit = () => {
    // Preserve publicationId query param when navigating to edit
    const publicationId = searchParams.get('publicationId')
    const queryString = publicationId ? `?publicationId=${publicationId}` : ''
    navigate(`/survey/${survey?._id}/response/${responseId}/edit${queryString}`)
  }

  const handleDelete = async () => {
    if (!responseId) return
    setIsDeleting(true)
    try {
      await surveyResponseDelete(responseId)
      setFlashMessage('success', 'Response deleted successfully')
      handleBack()
    } catch (error) {
      console.error('Failed to delete response:', error)
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (isLoading) {
    return (
      <SurveyEditorNavContainer surveyName={survey?.name}>
        <SurveyPageContent showBackButton={false}>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
  }

  if (error || !response) {
    return (
      <SurveyEditorNavContainer surveyName={survey?.name}>
        <SurveyPageContent
          backButtonUrl={`/survey/${survey?._id}/response`}
          onBackClick={handleBack}
        >
          <Alert variant="destructive">
            <AlertDescription>
              {error ? String(error) : 'Response not found'}
            </AlertDescription>
          </Alert>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
  }

  const participant = response.participant
  const anonymous = !!snapshotData?.survey?.access?.anonymous

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/response`}
        onBackClick={handleBack}
        headerActions={
          <ResponseViewHeader
            onEdit={handleEdit}
            onDelete={() => setShowDeleteDialog(true)}
          />
        }
      >
        <div className="max-w-7xl mx-auto">
          <Accordion
            type="multiple"
            defaultValue={['participant', 'response', 'answers']}
            className="grid grid-cols-1 xl:grid-cols-2 gap-4"
          >
            <div className="space-y-4">
              <ParticipantInfoSection
                participantId={response.participantId}
                participant={participant}
              />
              {response.publication && (
                <PublicationInfoSection publication={response.publication} />
              )}
              {response.snapshot && (
                <SnapshotInfoSection snapshot={response.snapshot} />
              )}
            </div>
            <div className="space-y-4">
              <ResponseDetailsSection
                response={response}
                anonymous={anonymous}
              />
              <AnswersSection
                snapshotData={snapshotData ?? {}}
                answers={response.answers as Record<string, unknown>}
                files={responseFiles}
              />
            </div>
          </Accordion>
        </div>
      </SurveyPageContent>

      <DeleteResponseDialog
        open={showDeleteDialog}
        isDeleting={isDeleting}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
      />
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditResponseView
