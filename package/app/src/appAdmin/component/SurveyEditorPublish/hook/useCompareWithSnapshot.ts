import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveyComparisonResult } from 'veysur-common'

import { getSurveySnapshotApi } from 'appAdmin/component/Survey'

export const useCompareWithSnapshot = ({
  surveyId,
  snapshotId,
  enabled,
}: {
  surveyId?: string
  snapshotId?: string
  enabled: boolean
}) => {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } =
    useAuthdQuery<SurveyComparisonResult | null>(
      {
        queryKey: ['surveySnapshot', 'compare', surveyId, snapshotId],
        queryFn: async () => {
          if (!surveyId || !snapshotId) return null
          const result = await getSurveySnapshotApi().compareWithCurrent(
            surveyId,
            snapshotId,
          )
          return result.comparison
        },
        enabled: enabled && !!surveyId && !!snapshotId,
        refetchOnMount: 'always',
        staleTime: 0, // Always consider data stale, so invalidation triggers immediate refetch
      },
      queryClient,
    )

  return {
    comparison: data || null,
    isLoading,
    isError,
    error,
  }
}
