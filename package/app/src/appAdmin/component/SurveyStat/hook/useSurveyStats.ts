import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { CompletionStatusFilter } from 'veysur-common'

import { KEY_STATE_SURVEY_STATS } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'

import { getSurveyStatsApi } from '../registry/getSurveyStatsApi'

const SURVEY_STATS_STALE_TIME_MS = 5 * 60 * 1000

export function useSurveyStats(
  surveyId: string,
  snapshotId?: string,
  publicationId?: string,
  completed: CompletionStatusFilter = 'all',
  startDate?: string | null,
  endDate?: string | null,
  dateField: 'createdAt' | 'completed' | 'updatedAt' = 'createdAt',
  search?: string,
) {
  const queryClient = useQueryClient()
  const project = useProjectDomain()

  const fetchStats = async () => {
    if (!project?._id || !surveyId || !snapshotId) return null
    return getSurveyStatsApi().getStats(
      surveyId,
      snapshotId,
      publicationId,
      completed,
      startDate,
      endDate,
      dateField,
      search,
    )
  }

  const { data, isLoading, isFetching, error } = useAuthdQuery(
    {
      enabled: !!project?._id && !!surveyId && !!snapshotId,
      queryKey: [
        KEY_STATE_SURVEY_STATS,
        surveyId,
        snapshotId,
        publicationId,
        completed,
        startDate,
        endDate,
        dateField,
        search,
      ],
      queryFn: async () => {
        return fetchStats()
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      staleTime: SURVEY_STATS_STALE_TIME_MS,
    },
    queryClient,
  )

  return {
    stats: data || null,
    isLoading,
    isFetching,
    error,
  }
}
