import { BUFFERED_PATCH_ACTION_UPDATE, Patch } from 'veysur-common'

import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'

import { getSettingSurveyApi } from 'appAdmin/component/SettingSurvey/registry'
import {
  KEY_STATE_SETTING_SURVEY,
  KEY_STATE_SETTING_SURVEY_EDITING,
} from 'appAdmin/component/SettingSurvey/common/keyState'

export type BotProtectionKeysInput = { siteKey: string; secretKey: string }

export type BotProtectionInput = {
  provider: string
  cloudflare: BotProtectionKeysInput
  google: BotProtectionKeysInput
}

export function useProjectBotProtectionUpdate(projectId: string) {
  const mutation = useInvalidatingMutation({
    mutationFn: (input: BotProtectionInput) => {
      const trim = (keys: BotProtectionKeysInput) => ({
        siteKey: keys.siteKey.trim(),
        secretKey: keys.secretKey.trim(),
      })
      const patches: Patch[] = [
        {
          type: 'settingSurvey',
          action: BUFFERED_PATCH_ACTION_UPDATE,
          data: {
            botProtection: {
              provider: input.provider,
              cloudflare: trim(input.cloudflare),
              google: trim(input.google),
            },
          },
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
    updateBotProtection: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
