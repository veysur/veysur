import { BUFFERED_PATCH_ACTION_UPDATE, Survey } from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SURVEY } from '../../constant'

export interface SectionOperationsConfig {
  section: string
  update: (s: Survey, updates: Record<string, unknown>) => Survey
  setProperty: (s: Survey, key: string, value: unknown) => Survey
}

export const createSectionOperations = (
  { updateSurveyState, validateAndBuffer }: OperationDependencies,
  config: SectionOperationsConfig,
) => ({
  update: (updates: Record<string, unknown>) => {
    updateSurveyState((s) => {
      s = config.update(s, updates)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { [config.section]: updates },
          },
        ],
      })
      return s
    })
  },
  updateSetting: (key: string, value: unknown) => {
    updateSurveyState((s) => {
      s = config.setProperty(s, key, value)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { [`${config.section}.${key}`]: value },
          },
        ],
      })
      return s
    })
  },
})
