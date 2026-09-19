import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'
import { PageHeader } from 'component/PageHeader'
import { SuccessCard } from 'component/SuccessCard'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import { useAuth, useProjectDomain } from 'appAdmin/hook'
import {
  useTeamInviteSend,
  TeamInviteForm,
} from 'appAdmin/component/TeamManagement'

export const PageTeamInvite: React.FC = () => {
  usePageTitle('Invite Team Member', { suffix: 'Veysur Admin' })
  const { auth } = useAuth()
  const project = useProjectDomain()
  const { showFlashMessage } = useFlashMessage({ autoDisplay: true })
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)

  const isOwner = auth?.user?.projectOwn?.some((p) => p._id === project?._id)

  const {
    sendInvite,
    isLoading: isSending,
    error: sendError,
  } = useTeamInviteSend()

  if (!isOwner) {
    return <Navigate to="/survey" replace />
  }

  const handleSubmit = async (data: {
    nameFirst: string
    nameLast?: string
    email: string
  }) => {
    await sendInvite(data)
    showFlashMessage('success', `Invitation sent to ${data.email}`)
    setInvitedEmail(data.email)
  }

  return (
    <AdminPageLayout>
      <PageHeader backUrl="/team" maxWidth="max-w-4xl" />
      <div className="max-w-4xl mx-auto">
        {invitedEmail ? (
          <SuccessCard
            message={`Invitation sent to ${invitedEmail}`}
            actionLabel="Invite Another Member"
            onAction={() => setInvitedEmail(null)}
          />
        ) : (
          <TeamInviteForm
            onSubmit={handleSubmit}
            isLoading={isSending}
            error={sendError}
          />
        )}
      </div>
    </AdminPageLayout>
  )
}

export default PageTeamInvite
