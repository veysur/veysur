import { useMutation } from '@tanstack/react-query'

import { useAuth } from 'hook'

import { getProjectAdminInviteApi } from '../registry'

export function useProjectAdminInviteAccept() {
  const { authRefresh } = useAuth()

  const mutation = useMutation({
    mutationFn: async ({ code, email }: { code: string; email: string }) => {
      await getProjectAdminInviteApi().accept(code, email)
      await authRefresh(true)
    },
  })

  return {
    acceptInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
