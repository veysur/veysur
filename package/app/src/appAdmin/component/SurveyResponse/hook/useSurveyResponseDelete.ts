import { useProjectDomain } from 'appAdmin/hook'
import { useInvalidatingMutation } from 'hook'

import { getSurveyResponseApi } from '../registry'
import { surveyResponseQueryKeys } from './surveyResponseQueryKeys'

export function useSurveyResponseDelete(
  surveyId: string,
  snapshotId: string,
  publicationId?: string,
) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (responseId: string) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      await getSurveyResponseApi().delete(surveyId, responseId)
      return true
    },
    invalidateKeys: surveyResponseQueryKeys({
      surveyId,
      snapshotId,
      publicationId,
    }),
  })

  return {
    surveyResponseDelete: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
