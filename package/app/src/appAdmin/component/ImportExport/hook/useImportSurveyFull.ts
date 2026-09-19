import { useMutation } from '@tanstack/react-query'

import { useProjectDomain } from 'appAdmin/hook'
import { ErrorRest } from 'model'

import { getImportExportApi } from '../registry'
import { ProcessImportResponse, ImportValidationError } from '../model'

export type ImportSurveyFullParams = {
  file: File
  onProgress?: (progress: { stage: 'uploading' | 'processing' }) => void
}

export function useImportSurveyFull() {
  const project = useProjectDomain()

  const mutation = useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: ImportSurveyFullParams): Promise<ProcessImportResponse> => {
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()

      onProgress?.({ stage: 'uploading' })
      const { fileId, uploadUrl } = await api.generateImportUrl('surveyFull', {
        format: 'vssa',
        options: {},
      })

      await api.uploadToS3(uploadUrl, file)

      onProgress?.({ stage: 'processing' })
      return await api.processImport(fileId)
    },
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
    importSurveyFull: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: error?.message ?? null,
    validationError,
    result: mutation.data,
  }
}
