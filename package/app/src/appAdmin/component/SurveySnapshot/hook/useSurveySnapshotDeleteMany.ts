import { KEY_STATE_SURVEY_SNAPSHOT_LIST } from 'appAdmin/common'
import { getSurveySnapshotApi } from 'appAdmin/component/Survey'
import { useInvalidatingMutation } from 'hook'

export function useSurveySnapshotDeleteMany(surveyId: string) {
  const mutation = useInvalidatingMutation({
    mutationFn: async (snapshotIds: string[]) => {
      if (!surveyId) {
        throw new Error('Survey not found')
      }

      await getSurveySnapshotApi().deleteMany(surveyId, snapshotIds)
      return true
    },
    invalidateKeys: [[KEY_STATE_SURVEY_SNAPSHOT_LIST, surveyId]],
  })

  return {
    surveySnapshotDeleteMany: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
