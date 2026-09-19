import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { SettingSurvey, PatchBuffer } from 'veysur-common'

import { useAuth, useProjectDomain } from 'hook'
import { getSettingSurveyApi } from '../registry'
import { KEY_STATE_SETTING_SURVEY_EDITING } from '../common/keyState'

type Props = {
  patchBuffer: PatchBuffer
}

export function useSettingSurveyApiGet({ patchBuffer }: Props) {
  const queryClient = useQueryClient()
  const { auth } = useAuth()
  const project = useProjectDomain()

  const {
    data: settingSurvey,
    isError,
    isLoading,
    isFetching,
    error,
  } = useAuthdQuery<SettingSurvey | undefined>(
    {
      enabled: !!project?._id && patchBuffer.isEmpty(),
      queryKey: [KEY_STATE_SETTING_SURVEY_EDITING],
      queryFn: async () => {
        if (!auth?.accessToken?.token) {
          return Promise.reject('Authentication required')
        }
        if (!project?._id) {
          return Promise.reject('Invalid project ID')
        }

        // Get admin survey settings for the project
        const setting = await getSettingSurveyApi().getOne()
        return new SettingSurvey(setting)
      },
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    },
    queryClient,
  )

  const updateSettingSurveyState = (SettingSurvey?: SettingSurvey) => {
    queryClient.setQueryData(
      [KEY_STATE_SETTING_SURVEY_EDITING],
      () => SettingSurvey,
    )
  }

  const resetSettingSurvey = () => {
    queryClient.setQueryData([KEY_STATE_SETTING_SURVEY_EDITING], () => null)
  }

  return {
    settingSurvey,
    isLoading,
    isFetching,
    isError,
    error,
    updateSettingSurveyState,
    resetSettingSurvey,
  }
}
