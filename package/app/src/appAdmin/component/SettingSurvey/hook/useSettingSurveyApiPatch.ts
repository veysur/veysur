import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Patch } from 'veysur-common'

import { useAuth, useProjectDomain } from 'hook'
import { getSettingSurveyApi } from '../registry'

export function useSettingSurveyApiPatch() {
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const project = useProjectDomain()

  const patchMutation = useMutation(
    {
      mutationFn: async (patches: Patch[]) => {
        if (!auth?.accessToken?.token) {
          return Promise.reject('Authentication required')
        }
        if (!project?._id) return Promise.reject('Invalid project ID')
        return getSettingSurveyApi().patch(patches)
      },
    },
    queryClient,
  )

  return {
    patchMutation,
  }
}
