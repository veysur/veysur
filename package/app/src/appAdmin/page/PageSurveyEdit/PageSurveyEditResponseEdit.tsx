import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SurveyResponse } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { useFlashMessage } from 'component/FlashMessage'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
  usePublishedPartialApiGet,
} from 'appAdmin/component/SurveyEditor'
import {
  useSurveyResponseUpdate,
  SurveyResponseForm,
} from 'appAdmin/component/SurveyResponse'
import { getSurveyResponseApi } from 'appAdmin/component/SurveyResponse/registry'
import { useProjectDomain } from 'appAdmin/hook'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { usePageTitle } from 'hook'

export const PageSurveyEditResponseEdit: React.FC = () => {
  const { responseId } = useParams<{
    responseId: string
  }>()
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const project = useProjectDomain()

  const [response, setResponse] = useState<SurveyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle(`Edit Response - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { setFlashMessage } = useFlashMessage()

  const { snapshot } = usePublishedPartialApiGet({
    surveyId: survey?._id,
  })

  const {
    surveyResponseUpdate,
    isLoading: isSubmitting,
    error: updateError,
  } = useSurveyResponseUpdate(
    survey?._id || '',
    response?.snapshotId || snapshot?._id || '',
    response?.publicationId,
  )

  useEffect(() => {
    const fetchResponse = async () => {
      if (!responseId || !survey?._id || !project?._id) {
        return
      }

      try {
        const responseData = await getSurveyResponseApi().getOne(
          survey._id,
          responseId,
        )
        setResponse(new SurveyResponse(responseData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load response')
      } finally {
        setIsLoading(false)
      }
    }

    fetchResponse()
  }, [responseId, survey?._id, project?._id])

  const handleBack = () => {
    if (!survey?._id || !responseId) return
    navigate(`/survey/${survey._id}/response/${responseId}/view`)
  }

  const handleSubmit = async (data: Partial<PropsOf<SurveyResponse>>) => {
    if (!responseId || !survey?._id || !snapshot?._id) return

    try {
      await surveyResponseUpdate({ responseId, response: data })
      setFlashMessage('success', 'Response updated successfully')
      handleBack()
    } catch (err) {
      console.error('Failed to update response:', err)
    }
  }

  const handleCancel = () => {
    handleBack()
  }

  if (!survey?._id || !snapshot?._id) {
    return (
      <SurveyEditorNavContainer>
        <SurveyPageContent showBackButton={false}>
          <div className="text-center py-5">
            <p className="text-muted-foreground">
              No published survey snapshot found. Publish the survey to edit
              responses.
            </p>
          </div>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
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

  if (error || !response) {
    return (
      <SurveyEditorNavContainer>
        <SurveyPageContent
          backButtonUrl={`/survey/${survey?._id}/response/${responseId}/view`}
          onBackClick={handleBack}
        >
          <Alert variant="destructive" className="mx-auto">
            <AlertDescription>{error || 'Response not found'}</AlertDescription>
          </Alert>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
  }

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/response/${responseId}/view`}
        onBackClick={handleBack}
      >
        <SurveyResponseForm
          title={`Edit Response: ${response._id}`}
          response={response}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          error={updateError}
        />
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditResponseEdit
