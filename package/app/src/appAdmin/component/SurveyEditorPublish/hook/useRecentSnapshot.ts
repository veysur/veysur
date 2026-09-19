import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SurveySnapshotPartial } from 'veysur-common'

import { getSurveySnapshotApi } from 'appAdmin/component/Survey'

export const useRecentSnapshot = ({
  surveyId,
  enabled,
}: {
  surveyId?: string
  enabled: boolean
}) => {
  const queryClient = useQueryClient()

  return useAuthdQuery<SurveySnapshotPartial | null>(
    {
      queryKey: ['surveySnapshot', 'recent', surveyId],
      queryFn: async () => {
        if (!surveyId) return null
        const result = await getSurveySnapshotApi().getAll(surveyId, 1, 1)
        return result.snapshots[0] || null
      },
      enabled: enabled && !!surveyId,
    },
    queryClient,
  )
}
