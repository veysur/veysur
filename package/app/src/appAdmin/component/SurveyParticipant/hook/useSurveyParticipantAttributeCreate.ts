import { SurveyParticipantAttributeDefinition } from 'veysur-common'

import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantAttributeApi } from '../registry'

export function useSurveyParticipantAttributeCreate(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (
      attribute: Partial<SurveyParticipantAttributeDefinition>,
    ) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      return getSurveyParticipantAttributeApi().create(surveyId, attribute)
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST]],
  })

  return {
    surveyParticipantAttributeCreate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
