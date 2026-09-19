import { useMutation } from '@tanstack/react-query'

import { useAuth } from 'hook'
import { ErrorRest } from 'model/api'

import { UserProfileEmailFormData } from '../model'
import { getUserProfileApi } from '../registry'

export function useUserProfileEmail() {
  const { authRefresh } = useAuth()

  const mutation = useMutation({
    mutationFn: async (data: UserProfileEmailFormData) => {
      // Update email (validation is handled by schema remote validators)
      await getUserProfileApi().updateEmail(data.email)

      // Reload user state from server to get correct verification status
      await authRefresh(true)
    },
  })

  const error = mutation.error
  const errorMessage =
    error instanceof ErrorRest && error.ref === 'ERROR_DISPOSABLE_EMAIL_DOMAIN'
      ? 'Please use a permanent email address'
      : (error?.message ?? null)

  return {
    updateEmail: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: errorMessage,
  }
}
