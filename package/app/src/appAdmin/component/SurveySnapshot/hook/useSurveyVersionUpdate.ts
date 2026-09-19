import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_SNAPSHOT_LIST } from 'appAdmin/common'
import { getSurveySnapshotApi } from 'appAdmin/component/Survey'
import { useInvalidatingMutation } from 'hook'

export function useSurveySnapshotUpdate(surveyId: string, snapshotId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async (data: {
      label?: string | null
      notes?: string | null
    }) => {
      if (!project?._id || !surveyId || !snapshotId) {
        throw new Error('Project, survey, or snapshot not found')
      }

      const result = await getSurveySnapshotApi().update(
        surveyId,
        snapshotId,
        data,
      )
      return result
    },
    invalidateKeys: [[KEY_STATE_SURVEY_SNAPSHOT_LIST, surveyId]],
  })

  return {
    surveySnapshotUpdate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
