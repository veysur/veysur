import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantAttributeApi } from '../registry'

export function useSurveyParticipantAttributeDelete(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (attributeId: string) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      return getSurveyParticipantAttributeApi().delete(surveyId, attributeId)
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST]],
  })

  return {
    surveyParticipantAttributeDelete: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
