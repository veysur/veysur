import { useAuthdQuery } from 'hook/useAuthdQuery'
import { Survey } from 'veysur-common'

import { getSurveySnapshotApi } from 'appAdmin/component/Survey'
import { KEY_STATE_SURVEY_SNAPSHOT } from 'appAdmin/common/keyState'

export function useSurveySnapshot(surveyId: string, snapshotId: string) {
  const { data, isLoading, error } = useAuthdQuery({
    queryKey: [KEY_STATE_SURVEY_SNAPSHOT, surveyId, snapshotId],
    queryFn: async () => {
      if (!surveyId || !snapshotId) {
        return null
      }
      const response = await getSurveySnapshotApi().get(surveyId, snapshotId)
      return response
    },
    enabled: Boolean(surveyId && snapshotId),
  })

  // Construct proper Survey instance from snapshotData in return statement
  // This ensures model objects are reconstructed even when data comes from cache
  const snapshotData = data?.snapshotData
    ? {
        ...data.snapshotData,
        survey: data.snapshotData.survey
          ? new Survey(data.snapshotData.survey).applySortOrder()
          : null,
      }
    : null

  return {
    snapshot: data?.snapshot || null,
    snapshotData,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
