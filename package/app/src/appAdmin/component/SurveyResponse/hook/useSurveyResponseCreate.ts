import { SurveyResponse } from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { useProjectDomain } from 'appAdmin/hook'
import { useInvalidatingMutation } from 'hook'

import { getSurveyResponseApi } from '../registry'
import { surveyResponseQueryKeys } from './surveyResponseQueryKeys'

export function useSurveyResponseCreate(
  surveyId: string,
  snapshotId: string,
  publicationId?: string,
) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: Partial<PropsOf<SurveyResponse>>) => {
      if (!project?._id || !surveyId || !snapshotId) {
        throw new Error('Project, survey, or snapshot not found')
      }

      const result = await getSurveyResponseApi().create(
        surveyId,
        snapshotId,
        data,
        publicationId,
      )

      return new SurveyResponse(result)
    },
    invalidateKeys: (data) =>
      surveyResponseQueryKeys({
        surveyId,
        snapshotId,
        publicationId: data.publicationId,
      }),
  })

  return {
    surveyResponseCreate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
