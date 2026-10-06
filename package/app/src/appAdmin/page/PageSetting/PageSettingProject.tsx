import React from 'react'
import { Navigate } from 'react-router-dom'

import { usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'
import { PageHeader } from 'component/PageHeader'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import { useAuth, useProjectDomain } from 'appAdmin/hook'
import { useProjectTimezoneUpdate } from 'appAdmin/hook/useProjectTimezoneUpdate'
import { ProjectTimezoneForm } from 'appAdmin/component/ProjectSetting/ProjectTimezoneForm'
import { ProjectSettingsTransfer } from 'appAdmin/component/ProjectSetting/ProjectSettingsTransfer'

export const PageSettingProject: React.FC = () => {
  usePageTitle('Settings - Project', { suffix: 'Veysur Admin' })
  const { auth } = useAuth()
  const project = useProjectDomain()
  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })

  const isOwner = auth?.user?.projectOwn?.some((p) => p._id === project?._id)

  const {
    updateTimezone,
    isLoading: isSaving,
    error: saveError,
  } = useProjectTimezoneUpdate(project?._id ?? '')

  // useProjectDomain resolves the project in an effect after auth loads, so
  // on a cold load it is empty at first; redirecting then would bounce an owner.
  if (!project) {
    return null
  }

  if (!isOwner) {
    return <Navigate to="/survey" replace />
  }

  const handleSubmit = async (timezone: string) => {
    await updateTimezone(timezone)
    showFlashMessage('success', 'Project timezone updated')
  }

  return (
    <AdminPageLayout>
      <PageHeader
        title="Project"
        description="Project-wide settings."
        showBack={false}
      />
      <div className="max-w-2xl mx-auto space-y-4">
        <ProjectTimezoneForm
          timezone={project.timezone}
          onSubmit={handleSubmit}
          isLoading={isSaving}
          error={saveError}
        />
        <ProjectSettingsTransfer isOwner={isOwner} />
      </div>
    </AdminPageLayout>
  )
}

export default PageSettingProject
