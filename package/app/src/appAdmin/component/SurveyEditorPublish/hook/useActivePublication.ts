import { useMemo } from 'react'
import { SurveyPublication } from 'veysur-common'

import { usePublishedPartialApiGet } from './usePublishedPartialApiGet'
import { usePublishApiPost } from './usePublishApiPost'
import { useUnpublishApiPost } from './useUnpublishApiPost'
import { useHasUnpublishedChanges } from './useHasUnpublishedChanges'

type Props = {
  surveyId?: string
}

export function useActivePublication({ surveyId }: Props) {
  // Use the shared query hook instead of creating a duplicate query
  const {
    publication: publicationData,
    snapshot,
    isLoading,
    isError,
    error,
  } = usePublishedPartialApiGet({ surveyId })

  const { publishMutation, publish } = usePublishApiPost({ surveyId })
  const { unpublishMutation, unpublish } = useUnpublishApiPost({ surveyId })

  const publication = useMemo(
    () => (publicationData ? new SurveyPublication(publicationData) : null),
    [publicationData],
  )
  const isPublished = !!publication && !publication.stoppedAt
  const { hasUnpublishedChanges: changesPending } = useHasUnpublishedChanges({
    surveyId,
    isPublished,
  })

  return {
    publication,
    snapshot,
    isPublished,
    hasUnpublishedChanges: changesPending,
    isLoading,
    isError,
    error,
    publish,
    unpublish,
    publishMutation,
    unpublishMutation,
  }
}
