import React from 'react'

import { useFlashMessage } from 'component/FlashMessage'
import { useSettingSurvey } from 'appAdmin/component/SettingSurvey/hook/useSettingSurvey'
import { useProjectMapsKeyUpdate } from 'appAdmin/hook/useProjectMapsKeyUpdate'

import { ProjectMapsForm } from './ProjectMapsForm'

type Props = {
  projectId: string
}

export const ProjectMapsSection: React.FC<Props> = ({ projectId }) => {
  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })
  const { serverSettingSurvey } = useSettingSurvey()
  const { updateGoogleApiKey, isLoading, error } =
    useProjectMapsKeyUpdate(projectId)

  if (!serverSettingSurvey) return null

  const handleSubmit = async (googleApiKey: string) => {
    await updateGoogleApiKey(googleApiKey)
    showFlashMessage('success', 'Google Maps key saved')
  }

  const storedKey = serverSettingSurvey.maps?.googleApiKey ?? ''

  return (
    <ProjectMapsForm
      key={storedKey}
      googleApiKey={storedKey}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error}
    />
  )
}

export default ProjectMapsSection
