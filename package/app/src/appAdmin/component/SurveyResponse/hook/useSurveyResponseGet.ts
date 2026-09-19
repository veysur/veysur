import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveyResponse } from 'veysur-common'

import { KEY_STATE_SURVEY_RESPONSE_GET } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyResponseApi } from '../registry'

export function useSurveyResponseGet(surveyId: string, responseId: string) {
  const queryClient = useQueryClient()

  const project = useProjectDomain()

  const fetchSurveyResponse = async () => {
    if (!project?._id || !surveyId || !responseId) return
    return getSurveyResponseApi().getOne(surveyId, responseId)
  }

  const { data, isLoading, isFetching, error } = useAuthdQuery<
    Awaited<ReturnType<typeof fetchSurveyResponse>> | undefined
  >(
    {
      enabled: !!project?._id && !!surveyId && !!responseId,
      queryKey: [KEY_STATE_SURVEY_RESPONSE_GET, surveyId, responseId],
      queryFn: async () => {
        return fetchSurveyResponse()
      },
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      refetchOnWindowFocus: false,
    },
    queryClient,
  )

  const response = data ? new SurveyResponse(data) : null

  return {
    response,
    isLoading,
    isFetching,
    error,
  }
}
