import { useProjectDomain } from 'appAdmin/hook'
import { useInvalidatingMutation } from 'hook'

import { getSurveyResponseApi } from '../registry'
import { surveyResponseQueryKeys } from './surveyResponseQueryKeys'

export function useSurveyResponseDeleteMany(
  surveyId: string,
  snapshotId: string,
  publicationId?: string,
) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (ids: string[]) => {
      if (!project?._id || !surveyId || !snapshotId) {
        throw new Error('Project, survey, or snapshot not found')
      }
      if (!ids.length) {
        throw new Error('No IDs provided for deletion')
      }

      const result = await getSurveyResponseApi().delete(surveyId, ids)
      return result
    },
    invalidateKeys: surveyResponseQueryKeys({
      surveyId,
      snapshotId,
      publicationId,
    }),
  })

  return {
    surveyResponseDeleteMany: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
