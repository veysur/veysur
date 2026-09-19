import { useMutation } from '@tanstack/react-query'

import { UserProfilePasswordFormData } from '../model'
import { getUserProfileApi } from '../registry'

export function useUserProfilePassword() {
  const mutation = useMutation({
    mutationFn: async (data: UserProfilePasswordFormData) => {
      // Update password (validation is handled by schema remote validators)
      await getUserProfileApi().updatePassword({
        password: data.newPassword,
        passwordCurrent: data.currentPassword,
      })
    },
  })

  return {
    updatePassword: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
