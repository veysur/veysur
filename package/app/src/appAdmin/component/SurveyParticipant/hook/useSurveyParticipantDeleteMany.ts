import { useProjectDomain } from 'appAdmin/hook'
import {
  KEY_STATE_SURVEY_PARTICIPANT_LIST,
  KEY_STATE_SURVEY_PARTICIPANT_GET,
} from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

export function useSurveyParticipantDeleteMany(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (ids: string[]) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }
      if (!ids.length) {
        throw new Error('No IDs provided for deletion')
      }

      const result = await getSurveyParticipantApi().delete(surveyId, ids)
      return result
    },
    invalidateKeys: [
      [KEY_STATE_SURVEY_PARTICIPANT_LIST],
      [KEY_STATE_SURVEY_PARTICIPANT_GET],
    ],
  })

  return {
    surveyParticipantDeleteMany: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
