import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SurveyResponse } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { useFlashMessage } from 'component/FlashMessage'
import {
  SurveyEditorNavContainer,
  SurveyPageContent,
  useSurveyEditorStore,
  usePublishedPartialApiGet,
} from 'appAdmin/component/SurveyEditor'
import {
  useSurveyResponseCreate,
  SurveyResponseForm,
} from 'appAdmin/component/SurveyResponse'
import { usePageTitle } from 'hook'

export const PageSurveyEditResponseAdd: React.FC = () => {
  const navigate = useNavigate()
  const { snapshotId } = useParams<{ snapshotId?: string }>()
  const survey = useSurveyEditorStore((state) => state.survey)

  usePageTitle(`Add Response - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const { setFlashMessage } = useFlashMessage()

  const { publication, snapshot } = usePublishedPartialApiGet({
    surveyId: survey?._id,
  })

  const { surveyResponseCreate, isLoading } = useSurveyResponseCreate(
    survey?._id || '',
    snapshot?._id || '',
    publication?._id,
  )

  const handleBack = () => {
    if (!survey?._id) return
    navigate(`/survey/${survey._id}/response/snapshot/${snapshotId}`)
  }

  const handleSubmit = async (data: Partial<PropsOf<SurveyResponse>>) => {
    if (!survey?._id || !snapshot?._id) return

    try {
      await surveyResponseCreate({
        ...data,
        surveyId: survey._id,
        snapshotId: snapshot._id,
      })
      setFlashMessage('success', 'Response added successfully')
      handleBack()
    } catch (error) {
      console.error('Failed to create response:', error)
      throw error
    }
  }

  const handleCancel = () => {
    handleBack()
  }

  const content =
    !survey?._id || !snapshot?._id ? (
      <div className="col">
        <div className="text-center py-5">
          <p className="text-muted-foreground">
            No published survey snapshot found. Publish the survey to add
            responses.
          </p>
        </div>
      </div>
    ) : (
      <div className="col">
        <SurveyResponseForm
          title="Add Response"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    )

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <SurveyPageContent
        backButtonUrl={`/survey/${survey?._id}/response/snapshot/${snapshotId}`}
        onBackClick={handleBack}
      >
        {content}
      </SurveyPageContent>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditResponseAdd
