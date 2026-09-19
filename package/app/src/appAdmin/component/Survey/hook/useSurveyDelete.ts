import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyApi } from '../registry'

export function useSurveyDelete() {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (surveyId: string) => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      await getSurveyApi().delete(surveyId)
      return true
    },
    invalidateKeys: [[KEY_STATE_SURVEY_LIST]],
  })

  return {
    surveyDelete: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
