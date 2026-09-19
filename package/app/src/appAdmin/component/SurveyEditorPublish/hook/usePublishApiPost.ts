import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useAuth } from 'appAdmin/hook'
import { KEY_STATE_PUBLICATION_ACTIVE } from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'
import { useInvalidatingMutation } from 'hook'

import { preApiRequestAuthCheck } from '../../SurveyEditor/hook/preApiRequestAuthCheck'
import { publicationQueryKeys } from './publicationQueryKeys'

type Props = {
  surveyId?: string
}

type PublishParams = {
  label?: string | null
  notes?: string | null
  snapshotLabel?: string | null
  snapshotNotes?: string | null
}

export function usePublishApiPost({ surveyId }: Props) {
  const queryClient = useQueryClient()
  const { auth } = useAuth()

  const publishMutation = useInvalidatingMutation({
    mutationFn: async (params?: PublishParams) => {
      const promiseReject = preApiRequestAuthCheck(auth)
      if (promiseReject) return promiseReject
      if (!surveyId) {
        return Promise.reject('Invalid survey ID')
      }
      const response = await getPublicationApi().publish(
        surveyId,
        params?.label,
        params?.notes,
        params?.snapshotLabel,
        params?.snapshotNotes,
      )

      // Small delay to ensure database transaction is fully committed
      // before the invalidation-triggered refetch below reads it back
      await new Promise((resolve) => setTimeout(resolve, 100))

      return response
    },
    invalidateKeys: () => publicationQueryKeys(surveyId),
    onSuccess: (response) => {
      // Show appropriate toast message
      if (response.wasReused) {
        toast.success(
          `Survey published (reusing snapshot ${response.snapshot._id.slice(0, 8)}...)`,
        )
      } else {
        toast.success(
          `Survey published with new snapshot ${response.snapshot._id.slice(0, 8)}...`,
        )
      }

      // Set the cache immediately with the response data
      queryClient.setQueryData([KEY_STATE_PUBLICATION_ACTIVE, surveyId], {
        publication: response.publication,
        snapshot: response.snapshot,
        snapshotData: null,
      })
    },
  })

  const publish = (params?: PublishParams) =>
    publishMutation.mutateAsync(params)

  return {
    publishMutation,
    publish,
  }
}
