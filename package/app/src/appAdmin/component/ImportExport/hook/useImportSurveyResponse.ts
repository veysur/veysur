import {
  KEY_STATE_SURVEY_RESPONSE_LIST,
  KEY_STATE_SURVEY_STATS,
} from 'appAdmin/common'

import { useImportFlow, ImportFlowVariables } from './useImportFlow'

export type ImportSurveyResponseParams = ImportFlowVariables & {
  surveyId: string
  publicationId: string
  snapshotId: string
}

export function useImportSurveyResponse() {
  const flow = useImportFlow<ImportSurveyResponseParams>({
    entityType: 'surveyResponse',
    format: 'csv',
    buildOptions: ({ surveyId, publicationId, snapshotId }) => ({
      surveyId,
      publicationId,
      snapshotId,
    }),
    invalidateKeys: (_data, variables) => [
      [KEY_STATE_SURVEY_RESPONSE_LIST],
      [KEY_STATE_SURVEY_STATS, variables.surveyId],
    ],
  })

  return {
    importSurveyResponse: flow.mutateAsync,
    isLoading: flow.isLoading,
    error: flow.error,
    validationError: flow.validationError,
    result: flow.result,
  }
}
