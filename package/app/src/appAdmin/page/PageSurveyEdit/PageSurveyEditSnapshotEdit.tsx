import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  SurveySnapshotForm,
  useSurveySnapshot,
  useSurveySnapshotUpdate,
} from 'appAdmin/component/SurveySnapshot'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { usePageTitle } from 'hook'

export const PageSurveyEditSnapshotEdit: React.FC = () => {
  const navigate = useNavigate()
  const { surveyId, snapshotId } = useParams<{
    surveyId: string
    snapshotId: string
  }>()
  const survey = useSurveyEditorStore((state) => state.survey)

  usePageTitle(`Edit Snapshot - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const {
    snapshot,
    isLoading,
    error: fetchError,
  } = useSurveySnapshot(surveyId || '', snapshotId || '')

  const {
    surveySnapshotUpdate,
    isLoading: isUpdating,
    error: updateError,
  } = useSurveySnapshotUpdate(surveyId || '', snapshotId || '')

  const handleBack = () => {
    navigate(`/survey/${surveyId}/snapshot`)
  }

  const handleSubmit = async (data: { label: string; notes: string }) => {
    try {
      await surveySnapshotUpdate(data)
      handleBack()
    } catch {
      // Error handling is managed by the hook
    }
  }

  if (isLoading) {
    return (
      <SurveyEditorNavContainer>
        <SurveyPageContent showBackButton={false}>
          <div className="flex justify-center py-5">
            <Spinner />
          </div>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
  }

  if (fetchError || !snapshot) {
    return (
      <SurveyEditorNavContainer>
        <SurveyPageContent
          backButtonUrl={`/survey/${surveyId}/snapshot`}
          onBackClick={handleBack}
        >
          <Alert variant="destructive" className="mx-auto">
            <AlertDescription>
              {fetchError || 'Snapshot not found'}
            </AlertDescription>
          </Alert>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
  }

  const displayName = snapshot.label || `${snapshot._id.slice(-8)}`

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${surveyId}/snapshot`}
        onBackClick={handleBack}
      >
        <SurveySnapshotForm
          title={`Edit Snapshot: ${displayName}`}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
          error={updateError}
          initialData={{
            label: snapshot.label,
            notes: snapshot.notes,
          }}
        />
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditSnapshotEdit
