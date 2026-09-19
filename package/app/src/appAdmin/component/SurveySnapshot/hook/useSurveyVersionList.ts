import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveySnapshotPartial } from 'veysur-common'

import { KEY_STATE_SURVEY_SNAPSHOT_LIST } from 'appAdmin/common'
import { useAuth } from 'appAdmin/hook'
import { getSurveySnapshotApi } from 'appAdmin/component/Survey'

import { preApiRequestAuthCheck } from '../../SurveyEditor/hook/preApiRequestAuthCheck'

type Props = {
  surveyId?: string
  page?: number
  perPage?: number
}

export function useSurveySnapshotList({
  surveyId,
  page = 1,
  perPage = 10,
}: Props) {
  const queryClient = useQueryClient()
  const { auth } = useAuth()

  const { data, isError, isLoading, isFetching, error } = useAuthdQuery(
    {
      enabled: !!surveyId,
      queryKey: [KEY_STATE_SURVEY_SNAPSHOT_LIST, surveyId, page, perPage],
      queryFn: async () => {
        const promiseReject = preApiRequestAuthCheck(auth)
        if (promiseReject) return promiseReject
        if (!surveyId) {
          return Promise.reject('Invalid survey ID')
        }
        const response = await getSurveySnapshotApi().getAll(
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

  const { snapshots: rawSnapshots, snapshotCount } = data || {
    snapshots: [],
    snapshotCount: 0,
  }

  const snapshots =
    rawSnapshots?.map((snapshot) => new SurveySnapshotPartial(snapshot)) || []

  return {
    snapshots,
    snapshotCount,
    isLoading,
    isFetching,
    isError,
    error,
  }
}
