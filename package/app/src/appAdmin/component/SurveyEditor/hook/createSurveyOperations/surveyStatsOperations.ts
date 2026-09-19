import {
  BUFFERED_PATCH_ACTION_UPDATE,
  ChartType,
  ChartValueMode,
} from 'veysur-common'

import { OperationDependencies } from './type'
import { SURVEY_ENTITY_TYPE_SURVEY } from '../../constant'

export const createSurveyStatsOperations = ({
  updateSurveyState,
  validateAndBuffer,
}: OperationDependencies) => ({
  updateSurveyStatsQuestionChartType: (
    questionCode: string,
    chartType: ChartType,
  ) => {
    updateSurveyState((s) => {
      s = s.setStatsQuestionChartType(questionCode, chartType)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { stats: s.stats },
          },
        ],
      })
      return s
    })
  },
  updateSurveyStatsQuestionValueMode: (
    questionCode: string,
    valueMode: ChartValueMode,
  ) => {
    updateSurveyState((s) => {
      s = s.setStatsQuestionValueMode(questionCode, valueMode)
      validateAndBuffer({
        patches: [
          {
            type: SURVEY_ENTITY_TYPE_SURVEY,
            action: BUFFERED_PATCH_ACTION_UPDATE,
            id: s._id,
            data: { stats: s.stats },
          },
        ],
      })
      return s
    })
  },
})
