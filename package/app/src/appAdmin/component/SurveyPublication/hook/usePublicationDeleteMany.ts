import {
  KEY_STATE_PUBLICATION_ACTIVE,
  KEY_STATE_PUBLICATION_LIST,
} from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'
import { useInvalidatingMutation } from 'hook'

export function usePublicationDeleteMany(surveyId: string) {
  const mutation = useInvalidatingMutation({
    mutationFn: async (publicationIds: string[]) => {
      if (!surveyId) {
        throw new Error('Survey not found')
      }

      await getPublicationApi().deleteMany(surveyId, publicationIds)
      return true
    },
    invalidateKeys: [
      [KEY_STATE_PUBLICATION_LIST, surveyId],
      [KEY_STATE_PUBLICATION_ACTIVE, surveyId],
    ],
  })

  return {
    publicationDeleteMany: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
