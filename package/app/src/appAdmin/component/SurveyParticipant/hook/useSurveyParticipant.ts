import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveyParticipant } from 'veysur-common'

import { KEY_STATE_SURVEY_PARTICIPANT_GET } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyParticipantApi } from '../registry'

export function useSurveyParticipant(surveyId: string, participantId: string) {
  const queryClient = useQueryClient()

  const project = useProjectDomain()

  const enabled = !!project?._id && !!surveyId && !!participantId

  const fetchSurveyParticipant = async () => {
    if (!enabled) return
    return getSurveyParticipantApi().getOne(surveyId, participantId)
  }

  const { data, isPending, isFetching, error } = useAuthdQuery<
    Awaited<ReturnType<typeof fetchSurveyParticipant>> | undefined
  >(
    {
      enabled,
      queryKey: [KEY_STATE_SURVEY_PARTICIPANT_GET, surveyId, participantId],
      queryFn: async () => fetchSurveyParticipant(),
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      refetchOnWindowFocus: false,
    },
    queryClient,
  )

  const participant = data ? new SurveyParticipant(data) : null

  return {
    participant,
    // A disabled query (while `project` is still resolving) is not "loading";
    // guard so the edit page does not briefly flash "not found" before the
    // fetch starts.
    isLoading: enabled ? isPending : !!surveyId && !!participantId,
    isFetching,
    error: error instanceof Error ? error.message : null,
  }
}
