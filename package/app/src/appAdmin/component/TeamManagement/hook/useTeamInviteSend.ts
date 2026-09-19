import { useProjectDomain } from 'appAdmin/hook'
import { useInvalidatingMutation } from 'hook'

import { getTeamManagementApi } from '../registry'
import { TeamInviteData } from '../model'

export function useTeamInviteSend() {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: TeamInviteData) => {
      if (!project?._id) return
      return getTeamManagementApi().sendInvite(project._id, data)
    },
    invalidateKeys: [['teamMembers']],
  })

  return {
    sendInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
