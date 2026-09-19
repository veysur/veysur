import { useQuery, useQueryClient } from '@tanstack/react-query'
import { mergeParticipantData, ParticipantData } from 'veysur-common'

import { KEY_STATE_SURVEY_PARTICIPANT_ME } from 'appSurvey/common'
import { getSurveyParticipantApi } from 'appSurvey/registry'

export function useSurveyParticipantMe(surveyId?: string, authToken?: string) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(
    {
      enabled: !!surveyId && !!authToken,
      queryKey: [KEY_STATE_SURVEY_PARTICIPANT_ME, surveyId, authToken],
      queryFn: async () => {
        if (!surveyId || !authToken) return null
        return getSurveyParticipantApi().getMe(surveyId, authToken)
      },
    },
    queryClient,
  )

  const participantData: ParticipantData = mergeParticipantData(data)

  return { participantData, isLoading }
}
