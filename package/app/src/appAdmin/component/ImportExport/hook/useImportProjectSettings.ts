import { useAuth } from 'hook/useAuth'

import {
  KEY_STATE_PROJECT_DOMAIN,
  KEY_STATE_SURVEY_EMAIL_TEMPLATES,
} from 'appAdmin/common/keyState'
import {
  KEY_STATE_SETTING_SURVEY,
  KEY_STATE_SETTING_SURVEY_EDITING,
} from 'appAdmin/component/SettingSurvey/common/keyState'

import { ProcessImportResponse } from '../model'
import { useImportFlow, ImportFlowVariables } from './useImportFlow'

export type ProjectImportPart = 'timezone' | 'settings' | 'templates'

export type ImportProjectSettingsParams = ImportFlowVariables & {
  apply: ProjectImportPart[]
}

export function useImportProjectSettings() {
  const { authRefresh } = useAuth()

  const flow = useImportFlow<ImportProjectSettingsParams>({
    entityType: 'project',
    format: 'vsps',
    buildOptions: ({ apply }) => ({ apply }),
    invalidateKeys: [
      [KEY_STATE_SETTING_SURVEY],
      [KEY_STATE_SETTING_SURVEY_EDITING],
      [KEY_STATE_SURVEY_EMAIL_TEMPLATES],
      [KEY_STATE_PROJECT_DOMAIN],
    ],
  })

  const importProjectSettings = async (
    params: ImportProjectSettingsParams,
  ): Promise<ProcessImportResponse | undefined> => {
    const result = await flow.mutateAsync(params)
    // The project timezone is read from auth.user.projectOwn, not a query,
    // so an applied timezone only shows up after a forced auth refresh.
    if (
      result?.details?.some(
        (outcome) =>
          outcome.part === 'timezone' && outcome.status === 'applied',
      )
    ) {
      await authRefresh(true)
    }
    return result
  }

  return {
    importProjectSettings,
    isLoading: flow.isLoading,
    error: flow.error,
    validationError: flow.validationError,
    result: flow.result,
  }
}
