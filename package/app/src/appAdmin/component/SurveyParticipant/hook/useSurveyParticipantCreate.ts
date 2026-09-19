import {
  SurveyParticipant,
  StringRandom,
  Survey,
  SettingSurvey,
} from 'veysur-common'
import { PropsOf } from 'mzen-schema'

import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

type Options = {
  survey?: Survey
  defaults?: SettingSurvey
}

export function useSurveyParticipantCreate(
  surveyId: string,
  options?: Options,
) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: Partial<PropsOf<SurveyParticipant>>) => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      // Generate token client-side if survey and defaults are available
      if (!data.token && options?.survey && options?.defaults) {
        const { tokenLength } = options.survey.getParticipant(options.defaults)
        data.token = StringRandom.genAlphaNumericUpper(tokenLength)
      }

      const result = await getSurveyParticipantApi().create(surveyId, data)

      return new SurveyParticipant(result)
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_LIST]],
  })

  return {
    surveyParticipantCreate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
