import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

export function useSurveyParticipantResetReminderStatusMany(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (ids: string[]) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }
      if (!ids.length) {
        throw new Error('No IDs provided for reset')
      }

      const result = await getSurveyParticipantApi().resetReminderStatus(
        surveyId,
        ids,
      )
      return result
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_LIST]],
  })

  return {
    surveyParticipantResetReminderStatusMany: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
