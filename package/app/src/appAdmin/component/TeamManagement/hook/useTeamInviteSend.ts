import { useProjectDomain } from 'appAdmin/hook'
import { ErrorRest } from 'model/api'
import { useInvalidatingMutation } from 'hook'

import { getTeamManagementApi } from '../registry'
import { TeamInviteData } from '../model'

const PLUS_ADDRESS_MESSAGE =
  "Plus addresses aren't supported. Please use the plain email address."

export function useTeamInviteSend() {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: TeamInviteData) => {
      if (!project?._id) return
      return getTeamManagementApi().sendInvite(project._id, data)
    },
    invalidateKeys: [['teamMembers']],
  })

  const error = mutation.error
  const errorMessage =
    error instanceof ErrorRest && error.ref === 'ERROR_EMAIL_PLUS_ADDRESS'
      ? PLUS_ADDRESS_MESSAGE
      : error instanceof Error
        ? error.message
        : null

  return {
    sendInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: errorMessage,
  }
}
