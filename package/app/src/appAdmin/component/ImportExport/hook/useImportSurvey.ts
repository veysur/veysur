import { useImportFlow, ImportFlowVariables } from './useImportFlow'

export type ImportSurveyOptions = {
  force?: boolean
}

export type ImportProgress = {
  stage: 'uploading' | 'processing'
}

export type ImportSurveyParams = ImportFlowVariables & {
  options?: ImportSurveyOptions
}

export function useImportSurvey() {
  const flow = useImportFlow<ImportSurveyParams>({
    entityType: 'survey',
    format: 'vsst',
    buildOptions: ({ options }) => ({ force: options?.force ?? false }),
  })

  return {
    importSurvey: flow.mutateAsync,
    isLoading: flow.isLoading,
    error: flow.error,
    validationError: flow.validationError,
    result: flow.result,
  }
}
