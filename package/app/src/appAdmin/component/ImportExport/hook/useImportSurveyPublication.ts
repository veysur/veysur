import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { ErrorRest } from 'model'

import { getImportExportApi } from '../registry'
import { ProcessImportResponse, ImportValidationError } from '../model'

export type ImportSurveyPublicationOptions = {
  surveyId?: string
}

export type ImportSurveyPublicationParams = {
  file: File
  options?: ImportSurveyPublicationOptions
  onProgress?: (progress: { stage: 'uploading' | 'processing' }) => void
}

export function useImportSurveyPublication() {
  const project = useProjectDomain()

  const mutation = useMutation({
    mutationFn: async ({
      file,
      options,
      onProgress,
    }: ImportSurveyPublicationParams): Promise<ProcessImportResponse> => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()

      // Step 1: Get upload URL
      onProgress?.({ stage: 'uploading' })
      const { fileId, uploadUrl } = await api.generateImportUrl(
        'surveyPublication',
        {
          format: 'vssp',
          options: { surveyId: options?.surveyId },
        },
      )

      // Step 2: Upload to S3
      await api.uploadToS3(uploadUrl, file)

      // Step 3: Process import
      onProgress?.({ stage: 'processing' })
      return await api.processImport(fileId)
    },
  })

  const error = mutation.error as ErrorRest | null
  const validationError = error
    ? ({
        message: error.message,
        errors: error.errors,
        hint: error.hint,
        name: error.name,
      } as ImportValidationError)
    : null

  return {
    importSurveyPublication: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: error?.message ?? null,
    validationError: validationError,
    result: mutation.data,
  }
}
