import { useProjectDomain } from 'appAdmin/hook'
import {
  KEY_STATE_SURVEY_PARTICIPANT_LIST,
  KEY_STATE_SURVEY_PARTICIPANT_GET,
} from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

export function useSurveyParticipantDelete(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (participantId: string) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      await getSurveyParticipantApi().delete(surveyId, participantId)
      return true
    },
    invalidateKeys: [
      [KEY_STATE_SURVEY_PARTICIPANT_LIST],
      [KEY_STATE_SURVEY_PARTICIPANT_GET],
    ],
  })

  return {
    surveyParticipantDelete: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
