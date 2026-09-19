import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { ErrorRest } from 'model'

import { getImportExportApi } from '../registry'
import { ProcessImportResponse, ImportValidationError } from '../model'

export type ImportSurveyOptions = {
  force?: boolean
}

export type ImportProgress = {
  stage: 'uploading' | 'processing'
}

export type ImportSurveyParams = {
  file: File
  options?: ImportSurveyOptions
  onProgress?: (progress: ImportProgress) => void
}

export function useImportSurvey() {
  const project = useProjectDomain()

  const mutation = useMutation({
    mutationFn: async ({
      file,
      options,
      onProgress,
    }: ImportSurveyParams): Promise<ProcessImportResponse> => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()

      // Step 1: Get upload URL
      onProgress?.({ stage: 'uploading' })
      const { fileId, uploadUrl } = await api.generateImportUrl('survey', {
        format: 'vsst',
        options: { force: options?.force ?? false },
      })

      // Step 2: Upload to S3
      await api.uploadToS3(uploadUrl, file)

      // Step 3: Process import
      onProgress?.({ stage: 'processing' })
      return await api.processImport(fileId)
    },
  })

  // Extract validation error details if available
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
    importSurvey: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: error?.message ?? null,
    validationError: validationError,
    result: mutation.data,
  }
}
