import { useProjectDomain } from 'appAdmin/hook'
import { useInvalidatingMutation } from 'hook'

import { getTeamManagementApi } from '../registry'

export function useTeamMemberDelete() {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (projectAdminId: string) => {
      if (!project?._id) return
      await getTeamManagementApi().deleteTeamMember(project._id, projectAdminId)
    },
    invalidateKeys: [['teamMembers']],
  })

  return {
    deleteTeamMember: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
