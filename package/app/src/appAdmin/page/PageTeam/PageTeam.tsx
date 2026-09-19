import React from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Users, UserPlus } from 'lucide-react'
import { usePageTitle } from 'hook'
import { useFlashMessage } from 'component/FlashMessage'
import { Button } from 'component/shadcn/button'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import { SectionHeader } from 'component/SectionHeader'
import { useAuth, useProjectDomain, useFeatureGate } from 'appAdmin/hook'
import {
  useTeamMembers,
  useTeamMemberDelete,
  useTeamInviteCancel,
  TeamMemberList,
  TeamInviteList,
} from 'appAdmin/component/TeamManagement'

export const PageTeam: React.FC = () => {
  usePageTitle('Team', { suffix: 'Veysur Admin' })
  const { auth } = useAuth()
  const project = useProjectDomain()
  useFlashMessage({ autoDisplay: true })

  const isOwner = auth?.user?.projectOwn?.some((p) => p._id === project?._id)

  const { activeMembers, pendingInvites, declinedInvites, isLoading } =
    useTeamMembers()
  const { deleteTeamMember } = useTeamMemberDelete()
  const { cancelInvite } = useTeamInviteCancel()
  const { isAtLimit } = useFeatureGate()
  const atMemberLimit = isAtLimit('USERS')

  if (!isOwner) {
    return <Navigate to="/survey" replace />
  }

  const owner = auth!.user

  return (
    <AdminPageLayout>
      <SectionHeader
        icon={Users}
        title="Team"
        description="Team members and invitations."
      >
        {!atMemberLimit && (
          <Button
            variant="outline"
            size="sm"
            tooltip="Invite Team Member"
            asChild
          >
            <Link to="/team/invite">
              <UserPlus className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </SectionHeader>

      <div className="mt-6 space-y-8 max-w-4xl mx-auto">
        <section>
          <TeamMemberList
            owner={{
              _id: owner.email,
              nameFirst: owner.nameFirst,
              nameLast: owner.nameLast,
              email: owner.email,
            }}
            activeMembers={activeMembers}
            isLoading={isLoading}
            onDeleteMember={deleteTeamMember}
          />
        </section>

        {(pendingInvites.length > 0 || isLoading) && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Pending Invitations</h2>
            <TeamInviteList
              invites={pendingInvites}
              isLoading={isLoading}
              emptyMessage="No pending invitations."
              showCancel
              onCancel={cancelInvite}
            />
          </section>
        )}

        {declinedInvites.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Declined Invitations</h2>
            <TeamInviteList
              invites={declinedInvites}
              isLoading={isLoading}
              emptyMessage="No declined invitations."
            />
          </section>
        )}
      </div>
    </AdminPageLayout>
  )
}

export default PageTeam
