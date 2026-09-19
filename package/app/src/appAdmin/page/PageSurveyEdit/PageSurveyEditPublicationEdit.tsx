import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useFlashMessage } from 'component/FlashMessage'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  PublicationForm,
  usePublication,
  usePublicationUpdate,
} from 'appAdmin/component/SurveyPublication'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { usePageTitle } from 'hook'

export const PageSurveyEditPublicationEdit: React.FC = () => {
  const navigate = useNavigate()
  const { surveyId, publicationId } = useParams<{
    surveyId: string
    publicationId: string
  }>()
  const survey = useSurveyEditorStore((state) => state.survey)

  usePageTitle(`Edit Publication - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { setFlashMessage } = useFlashMessage()

  const {
    publication,
    isLoading,
    error: fetchError,
  } = usePublication(surveyId || '', publicationId || '')

  const {
    publicationUpdate,
    isLoading: isUpdating,
    error: updateError,
  } = usePublicationUpdate(surveyId || '', publicationId || '')

  const handleBack = () => {
    navigate(`/survey/${surveyId}/publication`)
  }

  const handleSubmit = async (data: { label: string; notes: string }) => {
    try {
      await publicationUpdate(data)
      setFlashMessage('success', 'Publication updated successfully')
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

  if (fetchError || !publication) {
    return (
      <SurveyEditorNavContainer>
        <SurveyPageContent
          backButtonUrl={`/survey/${surveyId}/publication`}
          onBackClick={handleBack}
        >
          <Alert variant="destructive" className="mx-auto">
            <AlertDescription>
              {fetchError || 'Publication not found'}
            </AlertDescription>
          </Alert>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
  }

  const displayName = publication.label || `${publication._id.slice(-8)}`

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${surveyId}/publication`}
        onBackClick={handleBack}
      >
        <PublicationForm
          title={`Edit Publication: ${displayName}`}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
          error={updateError}
          initialData={{
            label: publication.label,
            notes: publication.notes,
          }}
        />
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditPublicationEdit
