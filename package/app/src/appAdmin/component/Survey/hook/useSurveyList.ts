import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { Survey } from 'veysur-common'

import { KEY_STATE_SURVEY_LIST } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyApi } from '../registry'

export function useSurveyList(
  search?: string,
  page: number = 1,
  perPage: number = 20,
  startDate?: string,
  endDate?: string,
  dateField?: string,
) {
  const queryClient = useQueryClient()

  const project = useProjectDomain()

  const fetchSurveyList = async (
    pageNumber: number = 1,
    itemsPerPage: number = 20,
    searchQuery?: string,
    filterStartDate?: string,
    filterEndDate?: string,
    filterDateField?: string,
  ) => {
    if (!project?._id) return
    return getSurveyApi().getAll(
      pageNumber,
      itemsPerPage,
      searchQuery,
      filterStartDate,
      filterEndDate,
      filterDateField,
    )
  }

  const { data, isLoading, isFetching } = useAuthdQuery<
    Awaited<ReturnType<typeof fetchSurveyList>> | undefined
  >(
    {
      enabled: !!project?._id,
      queryKey: [
        KEY_STATE_SURVEY_LIST,
        page,
        perPage,
        search,
        startDate,
        endDate,
        dateField,
      ],
      queryFn: async () => {
        return fetchSurveyList(
          page,
          perPage,
          search,
          startDate,
          endDate,
          dateField,
        )
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
    queryClient,
  )

  const surveys =
    (data?.surveys?.length &&
      data.surveys.map((survey) => new Survey(survey))) ||
    []
  const surveyCount = data?.surveyCount || 0

  return {
    surveys,
    surveyCount,
    isLoading,
    isFetching,
  }
}
