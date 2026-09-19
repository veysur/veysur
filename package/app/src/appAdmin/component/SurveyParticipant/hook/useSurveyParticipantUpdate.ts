import {
  SurveyParticipant,
  StringRandom,
  Survey,
  SettingSurvey,
} from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { useProjectDomain } from 'appAdmin/hook'
import {
  KEY_STATE_SURVEY_PARTICIPANT_LIST,
  KEY_STATE_SURVEY_PARTICIPANT_GET,
} from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

type Options = {
  survey?: Survey
  defaults?: SettingSurvey
}

export function useSurveyParticipantUpdate(
  surveyId: string,
  participantId: string,
  options?: Options,
) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: Partial<PropsOf<SurveyParticipant>>) => {
      if (!project?._id || !surveyId || !participantId) {
        throw new Error('Project, survey, or participant not found')
      }

      // Generate token client-side if not set and survey/defaults are available
      if (!data.token && options?.survey && options?.defaults) {
        const { tokenLength } = options.survey.getParticipant(options.defaults)
        data.token = StringRandom.genAlphaNumericUpper(tokenLength)
      }

      const result = await getSurveyParticipantApi().update(
        surveyId,
        participantId,
        data,
      )

      return new SurveyParticipant(result)
    },
    invalidateKeys: [
      [KEY_STATE_SURVEY_PARTICIPANT_LIST],
      [KEY_STATE_SURVEY_PARTICIPANT_GET, surveyId, participantId],
    ],
  })

  return {
    surveyParticipantUpdate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
