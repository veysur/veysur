import { useMemo } from 'react'
import { SurveyPublication } from 'veysur-common'

import { usePublishedPartialApiGet } from './usePublishedPartialApiGet'
import { usePublishApiPost } from './usePublishApiPost'
import { useUnpublishApiPost } from './useUnpublishApiPost'
import { useHasUnpublishedChanges } from './useHasUnpublishedChanges'

type Props = {
  surveyId?: string
}

export function usePublished({ surveyId }: Props) {
  const {
    publication: publicationData,
    snapshot,
    isLoading: isLoadingGet,
    isFetching: isFetchingGet,
    isError: isErrorGet,
    error: errorGet,
  } = usePublishedPartialApiGet({ surveyId })

  const publication = useMemo(
    () => (publicationData ? new SurveyPublication(publicationData) : null),
    [publicationData],
  )

  const { publishMutation } = usePublishApiPost({
    surveyId,
  })
  const { unpublishMutation } = useUnpublishApiPost({
    surveyId,
  })

  const isPublished = !!publication && !publication.stoppedAt
  const { hasUnpublishedChanges } = useHasUnpublishedChanges({
    surveyId,
    isPublished,
  })
  const isLoading =
    isLoadingGet || publishMutation.isPending || unpublishMutation.isPending
  const isFetching = isFetchingGet
  const isError =
    isErrorGet || publishMutation.isError || unpublishMutation.isError
  const error = errorGet || publishMutation.error || unpublishMutation.error

  const publish = async (params?: {
    label?: string | null
    notes?: string | null
  }) => {
    return publishMutation.mutateAsync(params)
  }

  const unpublish = async () => {
    return unpublishMutation.mutateAsync(undefined)
  }

  return {
    publication,
    snapshot,
    isPublished,
    hasUnpublishedChanges,
    isLoading,
    isFetching,
    isError,
    error,
    publish,
    unpublish,
    publishMutation,
    unpublishMutation,
  }
}
