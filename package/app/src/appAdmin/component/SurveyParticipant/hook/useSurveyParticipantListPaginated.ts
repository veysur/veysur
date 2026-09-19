import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveyParticipant, CompletionStatus } from 'veysur-common'

import { KEY_STATE_SURVEY_PARTICIPANT_LIST } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyParticipantApi } from '../registry'

type Props = {
  surveyId?: string
  page?: number
  perPage?: number
  search?: string
  completionStatus?: CompletionStatus
}

export function useSurveyParticipantListPaginated({
  surveyId,
  page = 1,
  perPage = 20,
  search,
  completionStatus,
}: Props) {
  const queryClient = useQueryClient()
  const project = useProjectDomain()

  const enabled = !!project?._id && !!surveyId

  const { data, isError, isPending, isFetching, error } = useAuthdQuery(
    {
      enabled,
      queryKey: [
        KEY_STATE_SURVEY_PARTICIPANT_LIST,
        surveyId,
        page,
        perPage,
        search,
        completionStatus,
      ],
      queryFn: async () => {
        if (!project?._id || !surveyId) {
          return Promise.reject('Invalid survey or project ID')
        }
        const response = await getSurveyParticipantApi().getAll(
          surveyId,
          page,
          perPage,
          search,
          completionStatus,
        )
        return response
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
    queryClient,
  )

  const { participants: rawParticipants, participantCount } = data || {
    participants: [],
    participantCount: 0,
  }

  const participants =
    rawParticipants?.map((participant) => new SurveyParticipant(participant)) ||
    []

  return {
    participants,
    participantCount,
    // A disabled query (while `project` is still resolving) is not "loading";
    // guard so the list does not briefly flash an empty state before the
    // fetch starts.
    isLoading: !!surveyId && (!enabled || isPending),
    isFetching,
    isError,
    error,
  }
}
