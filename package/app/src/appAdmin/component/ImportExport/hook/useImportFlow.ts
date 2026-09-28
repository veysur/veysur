import { useProjectDomain } from 'appAdmin/hook'
import { ErrorRest } from 'model'
import { useInvalidatingMutation, InvalidateKeys } from 'hook'
import { calculateFileHash } from 'common/uploadFile'

import { getImportExportApi } from '../registry'
import { ProcessImportResponse, ImportValidationError } from '../model'
import { useResolveImportResult } from './useResolveImportResult'

export type ImportFlowProgress = { stage: 'uploading' | 'processing' }

export type ImportFlowVariables = {
  file: File
  onProgress?: (progress: ImportFlowProgress) => void
}

/**
 * Shared by every survey import mutation hook (useImportSurvey,
 * useImportSurveyFull, useImportSurveyPublication, useImportSurveyResponse):
 * hash the file, generate the upload URL, short-circuit via
 * useResolveImportResult() when the same content is already queued, upload
 * to S3, process the import, and extract validation error details. Each
 * hook wrapper only differs in entityType/format/options and (for
 * useImportSurveyResponse) which queries to invalidate on success.
 */
export function useImportFlow<TVariables extends ImportFlowVariables>({
  entityType,
  format,
  buildOptions,
  invalidateKeys = [],
}: {
  entityType: string
  format: string
  buildOptions: (variables: TVariables) => Record<string, string | boolean | undefined>
  invalidateKeys?: InvalidateKeys<ProcessImportResponse | undefined, TVariables>
}) {
  const project = useProjectDomain()
  const resolveImportResult = useResolveImportResult()

  const mutation = useInvalidatingMutation({
    mutationFn: async (
      variables: TVariables,
    ): Promise<ProcessImportResponse | undefined> => {
      const { file, onProgress } = variables
      if (!project?._id) {
        throw new Error('Project not found')
      }

      const api = getImportExportApi()
      const fileHash = await calculateFileHash(file)

      onProgress?.({ stage: 'uploading' })
      const urlResult = await api.generateImportUrl(entityType, {
        format,
        options: buildOptions(variables),
        fileHash,
      })

      // The same file content is already queued/processing - skip the
      // upload entirely rather than enqueue a duplicate job.
      if ('alreadyQueued' in urlResult) {
        return resolveImportResult({
          async: true,
          jobId: urlResult.jobId,
          status: urlResult.status,
          alreadyQueued: true,
        })
      }

      await api.uploadToS3(urlResult.uploadUrl, file)

      onProgress?.({ stage: 'processing' })
      const result = await api.processImport(urlResult.fileId)
      return resolveImportResult(result)
    },
    invalidateKeys,
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
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: error?.message ?? null,
    validationError,
    result: mutation.data,
  }
}
