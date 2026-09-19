import { useAuth } from 'hook/useAuth'
import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'

import { KEY_STATE_PROJECT_DOMAIN } from 'appAdmin/common'
import { getProjectApi } from 'appAdmin/registry/getProjectApi'

export function useProjectTimezoneUpdate(projectId: string) {
  const { authRefresh } = useAuth()

  const mutation = useInvalidatingMutation({
    mutationFn: (timezone: string) =>
      getProjectApi().updateTimezone(projectId, timezone),
    invalidateKeys: [[KEY_STATE_PROJECT_DOMAIN]],
    onSuccess: async () => {
      // Refresh auth to reload the updated timezone into
      // auth.user.projectOwn/projectAdmin - useProjectDomain() derives its
      // data from there, not a server-fetched query.
      await authRefresh(true)
    },
  })

  return {
    updateTimezone: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
