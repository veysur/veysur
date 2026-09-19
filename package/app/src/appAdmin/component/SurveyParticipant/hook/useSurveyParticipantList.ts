import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveyParticipant } from 'veysur-common'

import { KEY_STATE_SURVEY_PARTICIPANT_LIST } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyParticipantApi } from '../registry'
import { SurveyParticipantListApiResponse } from '../model/api/SurveyParticipantApi'

export function useSurveyParticipantList(surveyId: string, search?: string) {
  const queryClient = useQueryClient()

  const project = useProjectDomain()

  const enabled = !!project?._id && !!surveyId

  const { data, isPending, isFetching } = useAuthdQuery<
    SurveyParticipantListApiResponse | undefined
  >(
    {
      enabled,
      queryKey: [KEY_STATE_SURVEY_PARTICIPANT_LIST, surveyId, search],
      queryFn: async () => {
        if (!project?._id || !surveyId) return
        return getSurveyParticipantApi().getAll(surveyId, 1, 20, search)
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
    queryClient,
  )

  const participants =
    data?.participants?.map(
      (participant) => new SurveyParticipant(participant),
    ) || []

  return {
    participants,
    participantCount: data?.participantCount || 0,
    // Report loading until the query has actually been able to run and settle.
    // While `project` is still resolving the query is disabled, and a disabled
    // query is not "loading" - without this guard consumers briefly see an
    // empty/"not found" state before the fetch even starts.
    isLoading: !!surveyId && (!enabled || isPending),
    isFetching,
  }
}
