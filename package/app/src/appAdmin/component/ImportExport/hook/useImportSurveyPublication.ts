import { useImportFlow, ImportFlowVariables } from './useImportFlow'

export type ImportSurveyPublicationOptions = {
  surveyId?: string
}

export type ImportSurveyPublicationParams = ImportFlowVariables & {
  options?: ImportSurveyPublicationOptions
}

export function useImportSurveyPublication() {
  const flow = useImportFlow<ImportSurveyPublicationParams>({
    entityType: 'surveyPublication',
    format: 'vssp',
    buildOptions: ({ options }) => ({ surveyId: options?.surveyId }),
  })

  return {
    importSurveyPublication: flow.mutateAsync,
    isLoading: flow.isLoading,
    error: flow.error,
    validationError: flow.validationError,
    result: flow.result,
  }
}
