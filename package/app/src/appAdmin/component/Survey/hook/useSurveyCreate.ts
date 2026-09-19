import { Survey, SurveyData } from 'veysur-common'

import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyApi } from '../registry'

export function useSurveyCreate() {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: Partial<SurveyData>) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const surveyData = await getSurveyApi().create(data)
      return new Survey(surveyData)
    },
    invalidateKeys: [[KEY_STATE_SURVEY_LIST]],
  })

  return {
    surveyCreate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
