import { SurveyPublication } from 'veysur-common'

import { useRecentSnapshot } from './useRecentSnapshot'

type Props = {
  surveyId?: string
  publication: SurveyPublication | null
  enabled?: boolean
}

export function useComparisonSnapshot({
  surveyId,
  publication,
  enabled = true,
}: Props) {
  const hasSurveyPublication = !!publication

  const { data: recentSnapshot, isLoading: isLoadingRecent } =
    useRecentSnapshot({
      surveyId,
      enabled: enabled && !hasSurveyPublication,
    })

  // Use published snapshot if available, otherwise use most recent
  const snapshotId = hasSurveyPublication
    ? publication.snapshotId
    : recentSnapshot?._id

  const isComparingWithPublished = hasSurveyPublication

  return {
    snapshotId,
    isComparingWithPublished,
    isLoading: isLoadingRecent,
  }
}
