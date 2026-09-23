import { useQueryClient } from '@tanstack/react-query'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { useAuth } from 'hook/useAuth'

import { KEY_STATE_SURVEY_RESPONSE_FILES } from 'appAdmin/common'
import { useProjectDomain } from 'appAdmin/hook'
import { getFileApi } from 'appAdmin/registry/getFileApi'

/** Files a participant uploaded for `fileUpload` question answers on a
 * single response, each with a resolved public download URL. */
export function useResponseFiles(surveyId: string, responseId: string) {
  const queryClient = useQueryClient()
  const project = useProjectDomain()
  const { auth } = useAuth()
  const jwtToken = auth?.jwt?.token

  const { data, isLoading, error } = useAuthdQuery(
    {
      enabled: !!project?._id && !!surveyId && !!responseId && !!jwtToken,
      queryKey: [KEY_STATE_SURVEY_RESPONSE_FILES, surveyId, responseId],
      queryFn: async () => {
        if (!project?._id || !jwtToken) return
        return getFileApi().getFilesForResponse(
          project._id,
          jwtToken,
          surveyId,
          responseId,
        )
      },
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    queryClient,
  )

  return {
    files: data?.files ?? [],
    isLoading,
    error,
  }
}
