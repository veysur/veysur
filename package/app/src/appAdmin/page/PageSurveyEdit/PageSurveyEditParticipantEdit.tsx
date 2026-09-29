import React, { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SurveyParticipant } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  SurveyParticipantForm,
  useSurveyParticipant,
  useSurveyParticipantUpdate,
  useSurveyParticipantAttributeList,
} from 'appAdmin/component/SurveyParticipant'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Spinner } from 'component/shadcn/spinner'
import { usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'

export const PageSurveyEditParticipantEdit: React.FC = () => {
  const navigate = useNavigate()
  const { surveyId, participantId } = useParams<{
    surveyId: string
    participantId: string
  }>()
  const survey = useSurveyEditorStore((state) => state.survey)
  const defaults = useSurveyEditorStore((state) => state.defaults)
  const { setFlashMessage } = useFlashMessage()

  usePageTitle(`Edit Participant - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const {
    participant,
    isLoading,
    error: fetchError,
  } = useSurveyParticipant(surveyId || '', participantId || '')
  const { customAttributes } = useSurveyParticipantAttributeList(surveyId || '')
  const {
    surveyParticipantUpdate,
    isLoading: isUpdating,
    error: updateError,
  } = useSurveyParticipantUpdate(surveyId || '', participantId || '', {
    survey,
    defaults,
  })

  const initialFormData = useMemo(() => {
    if (!participant) return null
    return {
      nameFirst: participant.nameFirst,
      nameLast: participant.nameLast,
      email: participant.email,
      language: participant.language,
      token: participant.token,
      attributes: participant.attributes || {},
    }
  }, [participant])

  const handleBack = () => {
    navigate(`/survey/${survey?._id}/participant`)
  }

  const handleSubmit = async (data: Partial<PropsOf<SurveyParticipant>>) => {
    try {
      await surveyParticipantUpdate(data)
      setFlashMessage('success', 'Participant updated successfully')
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

  if (fetchError || !participant) {
    return (
      <SurveyEditorNavContainer>
        <SurveyPageContent
          backButtonUrl={`/survey/${survey?._id}/participant`}
          onBackClick={handleBack}
        >
          <Alert variant="destructive" className="mx-auto">
            <AlertDescription>
              {fetchError || 'Participant not found'}
            </AlertDescription>
          </Alert>
        </SurveyPageContent>
      </SurveyEditorNavContainer>
    )
  }

  const participantName =
    `${participant.nameFirst} ${participant.nameLast}`.trim()
  const displayName = participantName || participant.email

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/participant`}
        onBackClick={handleBack}
      >
        <SurveyParticipantForm
          title={`Edit Participant: ${displayName}`}
          onSubmit={handleSubmit}
          isLoading={isUpdating}
          error={updateError}
          initialData={initialFormData || undefined}
          isEditMode={true}
          customAttributes={customAttributes}
        />
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditParticipantEdit
