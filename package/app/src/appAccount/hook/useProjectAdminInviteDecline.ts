import { useMutation } from '@tanstack/react-query'

import { getProjectAdminInviteApi } from '../registry'

export function useProjectAdminInviteDecline() {
  const mutation = useMutation({
    mutationFn: async ({ code, email }: { code: string; email: string }) => {
      await getProjectAdminInviteApi().decline(code, email)
    },
  })

  return {
    declineInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
