import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { KEY_STATE_PUBLICATION_ACTIVE } from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'

type Props = {
  surveyId?: string
  enabled?: boolean
}

export function usePublishedPartialApiGet({ surveyId, enabled = true }: Props) {
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, isError, error } = useAuthdQuery(
    {
      queryKey: [KEY_STATE_PUBLICATION_ACTIVE, surveyId],
      queryFn: async () => {
        if (!surveyId) return null
        const result = await getPublicationApi().getPublished(surveyId, false)
        return result
      },
      enabled: enabled && !!surveyId,
      staleTime: 5000, // Consider data fresh for 5 seconds
      gcTime: 60000, // Keep in cache for 1 minute
    },
    queryClient,
  )

  return {
    publication: data?.publication || null,
    snapshot: data?.snapshot || null,
    isLoading,
    isFetching,
    isError,
    error,
  }
}
