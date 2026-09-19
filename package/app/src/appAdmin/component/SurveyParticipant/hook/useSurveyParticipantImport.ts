import { useProjectDomain } from 'appAdmin/hook'
import { KEY_STATE_SURVEY_PARTICIPANT_LIST } from 'appAdmin/common'
import { useInvalidatingMutation } from 'hook'

import { getSurveyParticipantApi } from '../registry'

export type ImportResult = {
  imported: number
  errors: number
}

export type ImportProgressData = {
  type: 'progress' | 'error' | 'complete'
  imported: number
  errors: number
  batchErrors?: Array<{ row: number; message: string }>
  message?: string
}

export function useSurveyParticipantImport(surveyId: string) {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File
      onProgress?: (data: ImportProgressData) => void
    }): Promise<ImportResult> => {
      if (!project?._id || !surveyId) {
        throw new Error('Project or survey not found')
      }

      const result = await getSurveyParticipantApi().import(
        surveyId,
        file,
        onProgress,
      )

      return result
    },
    invalidateKeys: [[KEY_STATE_SURVEY_PARTICIPANT_LIST]],
  })

  return {
    importParticipants: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    result: mutation.data,
  }
}
