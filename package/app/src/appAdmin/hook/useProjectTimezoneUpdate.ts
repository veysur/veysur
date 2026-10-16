import { useAuth } from 'hook/useAuth'
import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'

import { getProjectApi } from 'appAdmin/registry/getProjectApi'

export function useProjectTimezoneUpdate(projectId: string) {
  const { authRefresh } = useAuth()

  const mutation = useInvalidatingMutation({
    mutationFn: (timezone: string) =>
      getProjectApi().updateTimezone(projectId, timezone),
    // Not KEY_STATE_PROJECT_DOMAIN: its queryFn is a null stub, so invalidating
    // it resets the project to null and it is re-resolved from the stale auth.
    invalidateKeys: [],
    onSuccess: async () => {
      // useProjectDomain() derives its data from auth.user.projectOwn/
      // projectAdmin, so refreshing auth is what propagates the new timezone.
      await authRefresh(true)
    },
  })

  return {
    updateTimezone: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
