import { BUFFERED_PATCH_ACTION_UPDATE } from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SURVEY } from '../../constant'

export const createSurveyNotifyOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  updateSurveyNotify: (
    notify: Partial<{ basic: string; detailed: string }>,
  ) => {
    updateSurveyState((s) => {
      s = s.updateNotify(notify)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { notify },
          },
        ],
      })
      return s
    })
  },

  updateSurveyNotifySetting: (key: string, value: unknown) => {
    updateSurveyState((s) => {
      s = s.setNotifyProperty(key, value)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { [`notify.${key}`]: value },
          },
        ],
      })
      return s
    })
  },
})
