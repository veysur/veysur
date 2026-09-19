import { useMutation } from '@tanstack/react-query'

import { useAuth } from 'hook'

import { getUserTwoFactorApi } from '../registry'
import { TwoFactorSetupData } from '../model'

export function useUserTwoFactor() {
  const { authRefresh } = useAuth()

  const setupMutation = useMutation({
    mutationFn: async (): Promise<TwoFactorSetupData> => {
      return getUserTwoFactorApi().getSetupData()
    },
  })

  const enableMutation = useMutation({
    mutationFn: async ({ code, secret }: { code: string; secret: string }) => {
      await getUserTwoFactorApi().enable(code, secret)
      await authRefresh(true)
    },
  })

  const disableMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      await getUserTwoFactorApi().disable(password)
      await authRefresh(true)
    },
  })

  const dismissPromptMutation = useMutation({
    mutationFn: async () => {
      await getUserTwoFactorApi().dismissPrompt()
      await authRefresh(true)
    },
  })

  return {
    getSetupData: setupMutation.mutateAsync,
    isLoadingSetup: setupMutation.isPending,
    setupError: setupMutation.error?.message ?? null,
    enable: enableMutation.mutateAsync,
    isEnabling: enableMutation.isPending,
    enableError: enableMutation.error?.message ?? null,
    disable: disableMutation.mutateAsync,
    isDisabling: disableMutation.isPending,
    disableError: disableMutation.error?.message ?? null,
    dismissPrompt: dismissPromptMutation.mutateAsync,
  }
}
