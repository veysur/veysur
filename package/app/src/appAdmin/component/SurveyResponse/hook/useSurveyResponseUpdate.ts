import { SurveyResponse } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { useProjectDomain } from 'appAdmin/hook'
import { useInvalidatingMutation } from 'hook'

import { getSurveyResponseApi } from '../registry'
import { surveyResponseQueryKeys } from './surveyResponseQueryKeys'

export function useSurveyResponseUpdate(
  surveyId: string,
  snapshotId: string,
  publicationId?: string,
) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async ({
      responseId,
      response,
    }: {
      responseId: string
      response: Partial<PropsOf<SurveyResponse>>
    }) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      const result = await getSurveyResponseApi().update(
        surveyId,
        responseId,
        response,
      )
      return new SurveyResponse(result)
    },
    invalidateKeys: (_data, variables) =>
      surveyResponseQueryKeys({
        surveyId,
        snapshotId,
        publicationId,
        responseId: variables.responseId,
      }),
  })

  return {
    surveyResponseUpdate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
