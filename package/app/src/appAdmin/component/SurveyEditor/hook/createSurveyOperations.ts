import { OperationDependencies } from './createSurveyOperations/type'
import { createSurveyOperations as createSurveyOps } from './createSurveyOperations/surveyOperations'
import { createSurveyStatsOperations } from './createSurveyOperations/surveyStatsOperations'
import {
  createSurveyPresentationOperations,
  createSurveyParticipantOperations,
  createSurveyDataOperations,
  createSurveyAccessOperations,
  createSurveyScheduleOperations,
  createSurveyContentFormatOperations,
} from './createSurveyOperations/surveySectionOperations'
import { createSurveyLegalNoticeOperations } from './createSurveyOperations/surveyLegalNoticeOperations'
import { createSurveyDataPolicyOperations } from './createSurveyOperations/surveyDataPolicyOperations'
import { createSurveyNotifyOperations } from './createSurveyOperations/surveyNotifyOperations'
import { createSurveyWelcomeOperations } from './createSurveyOperations/surveyWelcomeOperations'
import { createSurveyCompleteOperations } from './createSurveyOperations/surveyThankYouOperations'
import { createGroupOperations } from './createSurveyOperations/groupOperations'
import { createQuestionOperations } from './createSurveyOperations/questionOperations'
import { createContentOperations } from './createSurveyOperations/contentOperations'
import { createAnswerOptionOperations } from './createSurveyOperations/answerOptionOperations'
import { createSubquestionOperations } from './createSurveyOperations/subquestionOperations'
import { createMatrixOperations } from './createSurveyOperations/matrixOperations'

export const createSurveyOperations = (
  updateSurveyState: OperationDependencies['updateSurveyState'],
  bufferPatches: OperationDependencies['bufferPatches'],
  setSurveyFocus: OperationDependencies['setSurveyFocus'],
  validateAndBuffer: OperationDependencies['validateAndBuffer'],
) => {
  const dependencies: OperationDependencies = {
    updateSurveyState,
    bufferPatches,
    setSurveyFocus,
    validateAndBuffer,
  }

  return {
    ...createSurveyOps(dependencies),
    ...createSurveyPresentationOperations(dependencies),
    ...createSurveyStatsOperations(dependencies),
    ...createSurveyParticipantOperations(dependencies),
    ...createSurveyDataOperations(dependencies),
    ...createSurveyAccessOperations(dependencies),
    ...createSurveyLegalNoticeOperations(dependencies),
    ...createSurveyDataPolicyOperations(dependencies),
    ...createSurveyScheduleOperations(dependencies),
    ...createSurveyContentFormatOperations(dependencies),
    ...createSurveyNotifyOperations(dependencies),
    ...createSurveyWelcomeOperations(dependencies),
    ...createSurveyCompleteOperations(dependencies),
    ...createGroupOperations(dependencies),
    ...createQuestionOperations(dependencies),
    ...createContentOperations(dependencies),
    ...createAnswerOptionOperations(dependencies),
    ...createSubquestionOperations(dependencies),
    ...createMatrixOperations(dependencies),
  }
}
