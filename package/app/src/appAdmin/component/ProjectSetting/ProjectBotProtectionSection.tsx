import React from 'react'

import { useFlashMessage } from 'component/FlashMessage'
import { useSettingProject } from 'appAdmin/hook/useSettingProject'
import { useProjectBotProtectionUpdate } from 'appAdmin/hook/useProjectBotProtectionUpdate'

import { ProjectBotProtectionForm } from './ProjectBotProtectionForm'

type Props = {
  projectId: string
}

export const ProjectBotProtectionSection: React.FC<Props> = ({ projectId }) => {
  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })
  const { settingProject } = useSettingProject()
  const { updateBotProtection, isLoading, error } =
    useProjectBotProtectionUpdate(projectId)

  if (!settingProject) return null

  const stored = settingProject.botProtection

  return (
    <ProjectBotProtectionForm
      key={JSON.stringify(stored)}
      stored={stored}
      onSubmit={async (input) => {
        await updateBotProtection(input)
        showFlashMessage('success', 'Bot protection saved')
      }}
      isLoading={isLoading}
      error={error}
    />
  )
}

export default ProjectBotProtectionSection
