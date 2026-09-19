import { useMutation } from '@tanstack/react-query'

import { useAuth } from 'hook'
import { clearPersistedCache } from 'common/queryClient'

import { getProjectAdminInviteApi } from '../registry'

export function useProjectAdminInviteAcceptNewAccount() {
  const { setAuth } = useAuth()

  const mutation = useMutation({
    mutationFn: async ({
      code,
      email,
      nameFirst,
      nameLast,
      password,
    }: {
      code: string
      email: string
      nameFirst: string
      nameLast?: string
      password: string
    }) => {
      const result = await getProjectAdminInviteApi().acceptNewAccount(
        code,
        email,
        { nameFirst, nameLast, password },
      )
      clearPersistedCache()
      setAuth(result)
      return result
    },
  })

  return {
    acceptNewAccount: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
