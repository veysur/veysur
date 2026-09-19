import { useQueryClient } from '@tanstack/react-query'

import { useAuthdQuery } from 'hook/useAuthdQuery'
import { KEY_STATE_PUBLICATION_HAS_CHANGES } from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'

type Props = {
  surveyId?: string
  isPublished?: boolean
}

/**
 * Real content-based "has unpublished changes" check - compares the live survey's
 * structural hash against the active publication's snapshot hash server-side, rather
 * than comparing survey.updatedAt to publication.publishedAt. This correctly reports no
 * changes when edits are made and then reverted (e.g. moving a question away and back to
 * its original position), since updatedAt bumps on every autosave regardless of whether
 * the resulting content actually differs.
 */
export function useHasUnpublishedChanges({ surveyId, isPublished }: Props) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useAuthdQuery<{ hasChanges: boolean } | null>(
    {
      queryKey: [KEY_STATE_PUBLICATION_HAS_CHANGES, surveyId],
      queryFn: async () => {
        if (!surveyId) return null
        return getPublicationApi().hasUnpublishedChanges(surveyId)
      },
      enabled: !!surveyId && !!isPublished,
      staleTime: 5000,
    },
    queryClient,
  )

  return {
    hasUnpublishedChanges: data?.hasChanges ?? false,
    isLoading,
  }
}
