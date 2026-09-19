import { useMutation } from '@tanstack/react-query'

import { useAuth } from 'hook'

import { getUserProfileApi } from '../registry'

export function useUserProfileBasicInfo() {
  const { auth, setAuth } = useAuth()

  const mutation = useMutation({
    mutationFn: async (data: { nameFirst: string; nameLast: string }) => {
      await getUserProfileApi().updateBasicInfo(data)

      // Update auth state with new values
      if (auth) {
        setAuth({
          ...auth,
          user: {
            ...auth.user,
            nameFirst: data.nameFirst,
            nameLast: data.nameLast,
          },
        })
      }
    },
  })

  return {
    updateBasicInfo: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
