import { useAuthdQuery } from 'hook/useAuthdQuery'
import { getPublicationApi } from 'appAdmin/component/Survey'

export function usePublicationMergePreview(
  surveyId: string,
  targetPublicationId: string,
  sourcePublicationId: string,
) {
  const query = useAuthdQuery({
    queryKey: [
      'publication-merge-preview',
      surveyId,
      targetPublicationId,
      sourcePublicationId,
    ],
    queryFn: async () => {
      return getPublicationApi().mergeResponses(
        surveyId,
        targetPublicationId,
        sourcePublicationId,
        {
          dryRun: true,
        },
      )
    },
    enabled: !!sourcePublicationId && !!surveyId && !!targetPublicationId,
  })

  return {
    previewResult: query.data,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  }
}
