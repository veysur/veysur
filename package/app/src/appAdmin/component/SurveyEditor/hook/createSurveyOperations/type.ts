import { Survey, Patch } from 'veysur-common'

import { SetSurveyFocus } from '../useSurveyEditorFocus'
import { ValidateAndBufferFn } from '../../validation/useValidateAndBuffer'

export type UpdateSurveyState = (updater: (s: Survey) => Survey) => void
export type BufferPatches = (patches: Patch[]) => void

export interface OperationDependencies {
  updateSurveyState: UpdateSurveyState
  bufferPatches: BufferPatches
  setSurveyFocus: SetSurveyFocus
  validateAndBuffer: ValidateAndBufferFn
}
