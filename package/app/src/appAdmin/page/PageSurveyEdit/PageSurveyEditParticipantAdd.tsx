import React from 'react'
import { useNavigate } from 'react-router-dom'
import { SurveyParticipant } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  SurveyParticipantForm,
  useSurveyParticipantCreate,
  useSurveyParticipantAttributeList,
} from 'appAdmin/component/SurveyParticipant'
import { usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'

export const PageSurveyEditParticipantAdd: React.FC = () => {
  const navigate = useNavigate()
  const survey = useSurveyEditorStore((state) => state.survey)
  const defaults = useSurveyEditorStore((state) => state.defaults)
  const { setFlashMessage } = useFlashMessage()

  usePageTitle(`Add Participant - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { surveyParticipantCreate, isLoading, error } =
    useSurveyParticipantCreate(survey?._id || '', { survey, defaults })
  const { customAttributes } = useSurveyParticipantAttributeList(
    survey?._id || '',
  )

  const handleBack = () => {
    navigate(`/survey/${survey?._id}/participant`)
  }

  const handleSubmit = async (data: Partial<PropsOf<SurveyParticipant>>) => {
    try {
      await surveyParticipantCreate(data)
      setFlashMessage('success', 'Participant added successfully')
      handleBack()
    } catch {
      // Error handling is managed by the hook
    }
  }

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/participant`}
        onBackClick={handleBack}
      >
        <SurveyParticipantForm
          title="Add New Participant"
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          customAttributes={customAttributes}
        />
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditParticipantAdd
