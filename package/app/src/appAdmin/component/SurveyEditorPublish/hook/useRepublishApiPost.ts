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

type RepublishParams = {
  snapshotId: string
  label?: string | null
  notes?: string | null
}

export function useRepublishApiPost({ surveyId }: Props) {
  const queryClient = useQueryClient()
  const { auth } = useAuth()

  const republishMutation = useInvalidatingMutation({
    mutationFn: async (params: RepublishParams) => {
      const promiseReject = preApiRequestAuthCheck(auth)
      if (promiseReject) return promiseReject
      if (!surveyId) {
        return Promise.reject('Invalid survey ID')
      }
      const response = await getPublicationApi().republish(
        surveyId,
        params.snapshotId,
        params.label,
        params.notes,
      )
      return response
    },
    invalidateKeys: () => publicationQueryKeys(surveyId),
    onSuccess: (response) => {
      queryClient.setQueryData([KEY_STATE_PUBLICATION_ACTIVE, surveyId], {
        publication: response.publication,
        snapshot: response.snapshot,
        snapshotData: null,
      })
    },
  })

  const republish = (params: RepublishParams) =>
    republishMutation.mutateAsync(params)

  return {
    republishMutation,
    republish,
  }
}
