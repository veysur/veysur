import { useInvalidatingMutation } from 'hook/useInvalidatingMutation'

import {
  BotProtectionInput,
  BotProtectionKeysInput,
} from 'appAdmin/api/SettingProjectApi'
import { KEY_STATE_SETTING_PROJECT } from 'appAdmin/common'
import { getSettingProjectApi } from 'appAdmin/registry/getSettingProjectApi'

export function useProjectBotProtectionUpdate(projectId: string) {
  const mutation = useInvalidatingMutation({
    mutationFn: (input: BotProtectionInput) => {
      const trim = (keys: BotProtectionKeysInput) => ({
        siteKey: keys.siteKey.trim(),
        secretKey: keys.secretKey.trim(),
      })
      return getSettingProjectApi().updateBotProtection({
        provider: input.provider,
        cloudflare: trim(input.cloudflare),
        google: trim(input.google),
      })
    },
    invalidateKeys: [[KEY_STATE_SETTING_PROJECT, projectId]],
  })

  return {
    updateBotProtection: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
