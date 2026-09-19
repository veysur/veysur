import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_PUBLICATION_LIST } from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'
import { useInvalidatingMutation } from 'hook'

export function usePublicationUpdate(surveyId: string, publicationId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: {
      label?: string | null
      notes?: string | null
    }) => {
      if (!project?._id || !surveyId || !publicationId) {
        throw new Error('Project, survey, or publication not found')
      }

      const result = await getPublicationApi().update(
        surveyId,
        publicationId,
        data,
      )
      return result
    },
    invalidateKeys: [[KEY_STATE_PUBLICATION_LIST, surveyId]],
  })

  return {
    publicationUpdate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
