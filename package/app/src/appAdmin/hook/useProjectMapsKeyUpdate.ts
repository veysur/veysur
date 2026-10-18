import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'

import { KEY_STATE_SETTING_PROJECT } from 'appAdmin/common'
import { getSettingProjectApi } from 'appAdmin/registry/getSettingProjectApi'

export function useProjectMapsKeyUpdate(projectId: string) {
  const mutation = useInvalidatingMutation({
    mutationFn: (googleApiKey: string) =>
      getSettingProjectApi().updateMaps(googleApiKey.trim()),
    invalidateKeys: [[KEY_STATE_SETTING_PROJECT, projectId]],
  })

  return {
    updateGoogleApiKey: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
