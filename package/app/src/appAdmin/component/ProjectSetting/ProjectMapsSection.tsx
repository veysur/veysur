import React from 'react'

import { useFlashMessage } from 'component/FlashMessage'
import { useSettingProject } from 'appAdmin/hook/useSettingProject'
import { useProjectMapsKeyUpdate } from 'appAdmin/hook/useProjectMapsKeyUpdate'

import { ProjectMapsForm } from './ProjectMapsForm'

type Props = {
  projectId: string
}

export const ProjectMapsSection: React.FC<Props> = ({ projectId }) => {
  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })
  const { settingProject } = useSettingProject()
  const { updateGoogleApiKey, isLoading, error } =
    useProjectMapsKeyUpdate(projectId)

  if (!settingProject) return null

  const handleSubmit = async (googleApiKey: string) => {
    await updateGoogleApiKey(googleApiKey)
    showFlashMessage('success', 'Google Maps key saved')
  }

  const storedKey = settingProject.maps?.googleApiKey ?? ''

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
