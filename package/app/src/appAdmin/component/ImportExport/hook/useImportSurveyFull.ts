import { useImportFlow, ImportFlowVariables } from './useImportFlow'

export type ImportSurveyFullParams = ImportFlowVariables

export function useImportSurveyFull() {
  const flow = useImportFlow<ImportSurveyFullParams>({
    entityType: 'surveyFull',
    format: 'vssa',
    buildOptions: () => ({}),
  })

  return {
    importSurveyFull: flow.mutateAsync,
    isLoading: flow.isLoading,
    error: flow.error,
    validationError: flow.validationError,
    result: flow.result,
  }
}
