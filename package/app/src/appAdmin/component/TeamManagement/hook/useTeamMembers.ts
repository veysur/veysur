import { useAuthdQuery } from 'hook/useAuthdQuery'
import { ProjectAdmin } from 'veysur-common'

import { useProjectDomain } from 'appAdmin/hook'
import { getTeamManagementApi } from '../registry'

export function useTeamMembers() {
  const project = useProjectDomain()

  const { data, isLoading, error } = useAuthdQuery({
    queryKey: ['teamMembers', project?._id],
    queryFn: async () => {
      if (!project?._id) return []
      return getTeamManagementApi().getTeamMembers(project._id)
    },
    enabled: !!project?._id,
  })

  const members = (data ?? []).map((m) => new ProjectAdmin(m))
  const activeMembers = members.filter(
    (m) => !m.status || m.status === 'active',
  )
  const pendingInvites = members.filter((m) => m.status === 'pending')
  const declinedInvites = members.filter((m) => m.status === 'declined')

  return {
    activeMembers,
    pendingInvites,
    declinedInvites,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
