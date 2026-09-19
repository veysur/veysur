import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

export type GenerateResult = {
  generatedCount: number
}

export function useSurveyParticipantGenerate(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (count: number): Promise<GenerateResult> => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      const result = await getSurveyParticipantApi().generate(surveyId, count)

      return result
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_LIST]],
  })

  return {
    generateParticipants: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    result: mutation.data,
  }
}
