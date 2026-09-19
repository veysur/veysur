import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveyResponse, CompletionStatusFilter } from 'veysur-common'

import { KEY_STATE_SURVEY_RESPONSE_LIST } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyResponseApi } from '../registry'

export function useSurveyResponseList(
  surveyId: string,
  snapshotId?: string,
  page: number = 1,
  perPage: number = 20,
  publicationId?: string,
  completed?: CompletionStatusFilter,
  startDate?: string | null,
  endDate?: string | null,
  dateField?: 'createdAt' | 'completed' | 'updatedAt',
  search?: string,
  merged?: 'all' | 'merged' | 'notMerged',
) {
  const queryClient = useQueryClient()

  const project = useProjectDomain()

  const fetchSurveyResponseList = async (
    pageNumber: number = 1,
    perPage: number = 10,
  ) => {
    if (!project?._id || !surveyId) return
    return getSurveyResponseApi().getAll(
      surveyId,
      pageNumber,
      perPage,
      snapshotId,
      publicationId,
      completed,
      startDate,
      endDate,
      dateField,
      search,
      merged,
    )
  }

  const { data, isLoading, isFetching } = useAuthdQuery<
    Awaited<ReturnType<typeof fetchSurveyResponseList>> | undefined
  >(
    {
      enabled:
        !!project?._id && !!surveyId && (!!snapshotId || !!publicationId),
      queryKey: [
        KEY_STATE_SURVEY_RESPONSE_LIST,
        surveyId,
        snapshotId,
        publicationId,
        page,
        perPage,
        completed,
        startDate,
        endDate,
        dateField,
        search,
        merged,
      ],
      queryFn: async () => {
        return fetchSurveyResponseList(page, perPage)
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
    queryClient,
  )

  const response =
    (data?.response?.length &&
      data?.response?.map((response) => new SurveyResponse(response))) ||
    []
  const responseCount = data?.responseCount || 0

  return {
    response,
    responseCount,
    isLoading,
    isFetching,
  }
}
