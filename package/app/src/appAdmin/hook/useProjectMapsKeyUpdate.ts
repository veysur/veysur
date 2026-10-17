import { BUFFERED_PATCH_ACTION_UPDATE, Patch } from 'veysur-common'

import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'

import { getSettingSurveyApi } from 'appAdmin/component/SettingSurvey/registry'
import {
  KEY_STATE_SETTING_SURVEY,
  KEY_STATE_SETTING_SURVEY_EDITING,
} from 'appAdmin/component/SettingSurvey/common/keyState'

export function useProjectMapsKeyUpdate(projectId: string) {
  const mutation = useInvalidatingMutation({
    mutationFn: (googleApiKey: string) => {
      const patches: Patch[] = [
        {
          type: 'settingSurvey',
          action: BUFFERED_PATCH_ACTION_UPDATE,
          data: { maps: { googleApiKey: googleApiKey.trim() } },
        },
      ]
      return getSettingSurveyApi().patch(patches)
    },
    invalidateKeys: [
      [KEY_STATE_SETTING_SURVEY, projectId],
      [KEY_STATE_SETTING_SURVEY_EDITING],
    ],
  })

  return {
    updateGoogleApiKey: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
