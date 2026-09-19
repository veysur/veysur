import {
  KEY_STATE_PUBLICATION_LIST,
  KEY_STATE_SURVEY_RESPONSE_LIST,
} from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'
import { useInvalidatingMutation } from 'hook'

type MergeOptions = {
  dryRun?: boolean
}

export function usePublicationMerge(
  surveyId: string,
  targetPublicationId: string,
  sourcePublicationId: string,
) {
  const mutation = useInvalidatingMutation({
    mutationFn: async (options: MergeOptions = {}) => {
      if (!surveyId || !targetPublicationId || !sourcePublicationId) {
        throw new Error('Survey, target, or source publication not found')
      }

      return getPublicationApi().mergeResponses(
        surveyId,
        targetPublicationId,
        sourcePublicationId,
        options,
      )
    },
    // Only invalidate queries if this was not a dry run
    invalidateKeys: (_result, variables) =>
      variables.dryRun
        ? []
        : [
            [KEY_STATE_PUBLICATION_LIST, surveyId],
            [KEY_STATE_SURVEY_RESPONSE_LIST, surveyId],
          ],
  })

  return {
    publicationMerge: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}
