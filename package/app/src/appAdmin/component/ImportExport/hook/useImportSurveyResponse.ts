import { useProjectDomain } from 'appAdmin/hook'
import {
  KEY_STATE_SURVEY_RESPONSE_LIST,
  KEY_STATE_SURVEY_STATS,
} from 'appAdmin/common'
import { ErrorRest } from 'model'
import { useInvalidatingMutation } from 'hook'

import { getImportExportApi } from '../registry'
import { ProcessImportResponse, ImportValidationError } from '../model'

export type ImportSurveyResponseParams = {
  file: File
  surveyId: string
  publicationId: string
  snapshotId: string
  onProgress?: (progress: { stage: 'uploading' | 'processing' }) => void
}

export function useImportSurveyResponse() {
  const project = useProjectDomain()

  const mutation = useInvalidatingMutation({
    mutationFn: async ({
      file,
      surveyId,
      publicationId,
      snapshotId,
      onProgress,
    }: ImportSurveyResponseParams): Promise<ProcessImportResponse> => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()

      // Step 1: Get upload URL
      onProgress?.({ stage: 'uploading' })
      const { fileId, uploadUrl } = await api.generateImportUrl(
        'surveyResponse',
        {
          format: 'csv',
          options: { surveyId, publicationId, snapshotId },
        },
      )

      // Step 2: Upload file
      await api.uploadToS3(uploadUrl, file)

      // Step 3: Process import
      onProgress?.({ stage: 'processing' })
      return await api.processImport(fileId)
    },
    invalidateKeys: (_data, variables) => [
      [KEY_STATE_SURVEY_RESPONSE_LIST],
      [KEY_STATE_SURVEY_STATS, variables.surveyId],
    ],
  })

  const error = mutation.error as
    | (ErrorRest &
        Partial<Pick<ImportValidationError, 'errors' | 'hint' | 'name'>>)
    | null
  const validationError = error
    ? ({
        message: error.message,
        errors: error.errors,
        hint: error.hint,
        name: error.name,
      } as ImportValidationError)
    : null

  return {
    importSurveyResponse: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: error?.message ?? null,
    validationError,
    result: mutation.data,
  }
}
