import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveyPublication } from 'veysur-common'

import { KEY_STATE_PUBLICATION_LIST } from 'appAdmin/common'
import { useAuth } from 'appAdmin/hook'
import { getPublicationApi } from 'appAdmin/component/Survey'

import { preApiRequestAuthCheck } from '../../SurveyEditor/hook/preApiRequestAuthCheck'

type Props = {
  surveyId?: string
  page?: number
  perPage?: number
}

export function usePublicationList({
  surveyId,
  page = 1,
  perPage = 10,
}: Props) {
  const queryClient = useQueryClient()
  const { auth } = useAuth()

  const { data, isError, isLoading, isFetching, error } = useAuthdQuery(
    {
      enabled: !!surveyId,
      queryKey: [KEY_STATE_PUBLICATION_LIST, surveyId, page, perPage],
      queryFn: async () => {
        const promiseReject = preApiRequestAuthCheck(auth)
        if (promiseReject) return promiseReject
        if (!surveyId) {
          return Promise.reject('Invalid survey ID')
        }
        const response = await getPublicationApi().getList(
          surveyId,
          page,
          perPage,
        )
        return response
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
    queryClient,
  )

  const { publications: rawPublications, publicationCount } = data || {
    publications: [],
    publicationCount: 0,
  }

  // Map to SurveyPublication instances
  const publications =
    rawPublications?.map(
      (publication: SurveyPublication) => new SurveyPublication(publication),
    ) || []

  return {
    publications,
    publicationCount,
    isLoading,
    isFetching,
    isError,
    error,
  }
}
