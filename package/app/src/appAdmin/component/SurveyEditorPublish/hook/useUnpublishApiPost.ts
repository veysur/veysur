import { useQueryClient } from '@tanstack/react-query'

import { useAuth } from 'appAdmin/hook'
import { KEY_STATE_PUBLICATION_ACTIVE } from 'appAdmin/common'
import { getPublicationApi } from 'appAdmin/component/Survey'
import { useInvalidatingMutation } from 'hook'

import { preApiRequestAuthCheck } from '../../SurveyEditor/hook/preApiRequestAuthCheck'
import { publicationQueryKeys } from './publicationQueryKeys'

type Props = {
  surveyId?: string
}

export function useUnpublishApiPost({ surveyId }: Props) {
  const queryClient = useQueryClient()
  const { auth } = useAuth()

  const unpublishMutation = useInvalidatingMutation({
    mutationFn: async () => {
      const promiseReject = preApiRequestAuthCheck(auth)
      if (promiseReject) return promiseReject
      if (!surveyId) {
        return Promise.reject('Invalid survey ID')
      }
      await getPublicationApi().unpublish(surveyId)
    },
    invalidateKeys: () => publicationQueryKeys(surveyId),
    onSuccess: () => {
      queryClient.setQueryData([KEY_STATE_PUBLICATION_ACTIVE, surveyId], null)
    },
  })

  const unpublish = () => unpublishMutation.mutateAsync(undefined)

  return {
    unpublishMutation,
    unpublish,
  }
}
