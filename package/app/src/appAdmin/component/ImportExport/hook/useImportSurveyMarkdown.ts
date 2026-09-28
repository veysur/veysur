import { useImportFlow, ImportFlowVariables } from './useImportFlow'

export type ImportSurveyMarkdownOptions = {
  force?: boolean
}

export type ImportSurveyMarkdownParams = ImportFlowVariables & {
  options?: ImportSurveyMarkdownOptions
}

export function useImportSurveyMarkdown() {
  const flow = useImportFlow<ImportSurveyMarkdownParams>({
    entityType: 'survey',
    format: 'markdown',
    buildOptions: ({ options }) => ({ force: options?.force ?? false }),
  })

  return {
    importSurveyMarkdown: flow.mutateAsync,
    isLoading: flow.isLoading,
    error: flow.error,
    validationError: flow.validationError,
    result: flow.result,
  }
}
