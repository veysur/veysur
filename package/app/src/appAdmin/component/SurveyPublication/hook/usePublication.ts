import { useAuthdQuery } from 'hook/useAuthdQuery'
import { getPublicationApi } from 'appAdmin/component/Survey'
import { KEY_STATE_PUBLICATION_LIST } from 'appAdmin/common/keyState'

export function usePublication(surveyId: string, publicationId: string) {
  const { data, isLoading, error } = useAuthdQuery({
    queryKey: [KEY_STATE_PUBLICATION_LIST, surveyId, publicationId],
    queryFn: async () => {
      if (!surveyId || !publicationId) {
        return null
      }
      const response = await getPublicationApi().get(surveyId, publicationId)
      return response
    },
    enabled: Boolean(surveyId && publicationId),
  })

  return {
    publication: data?.publication || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
