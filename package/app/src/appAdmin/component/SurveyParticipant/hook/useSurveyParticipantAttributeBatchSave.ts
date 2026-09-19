import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { BatchSaveRequest } from '../model/api/SurveyParticipantAttributeApi'
import { getSurveyParticipantAttributeApi } from '../registry'

export function useSurveyParticipantAttributeBatchSave(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (request: BatchSaveRequest) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      return getSurveyParticipantAttributeApi().batchSave(surveyId, request)
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_ATTRIBUTE_LIST]],
  })

  return {
    surveyParticipantAttributeBatchSave: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
