import { createSectionOperations } from './createSectionOperations'
import { OperationDependencies } from './type'

export const createSurveyAccessOperations = (deps: OperationDependencies) => {
  const { update, updateSetting } = createSectionOperations(deps, {
    section: 'access',
    update: (s, u) => s.updateAccess(u),
    setProperty: (s, k, v) => s.setAccessProperty(k, v),
  })
  return {
    updateSurveyAccess: update,
    updateSurveyAccessSetting: updateSetting,
  }
}

export const createSurveyDataOperations = (deps: OperationDependencies) => {
  const { update, updateSetting } = createSectionOperations(deps, {
    section: 'data',
    update: (s, u) => s.updateData(u),
    setProperty: (s, k, v) => s.setDataProperty(k, v),
  })
  return { updateSurveyData: update, updateSurveyDataSetting: updateSetting }
}

export const createSurveyParticipantOperations = (
  deps: OperationDependencies,
) => {
  const { update, updateSetting } = createSectionOperations(deps, {
    section: 'participant',
    update: (s, u) => s.updateParticipant(u),
    setProperty: (s, k, v) => s.setParticipantProperty(k, v),
  })
  return {
    updateSurveyParticipant: update,
    updateSurveyParticipantSetting: updateSetting,
  }
}

export const createSurveyPresentationOperations = (
  deps: OperationDependencies,
) => {
  const { update, updateSetting } = createSectionOperations(deps, {
    section: 'presentation',
    update: (s, u) => s.updatePresentation(u),
    setProperty: (s, k, v) => s.setPresentationProperty(k, v),
  })
  return {
    updateSurveyPresentation: update,
    updateSurveyPresentationSetting: updateSetting,
  }
}

export const createSurveyScheduleOperations = (deps: OperationDependencies) => {
  const { update, updateSetting } = createSectionOperations(deps, {
    section: 'schedule',
    update: (s, u) => s.updateSchedule(u),
    setProperty: (s, k, v) => s.setScheduleProperty(k, v),
  })
  return {
    updateSurveySchedule: update,
    updateSurveyScheduleSetting: updateSetting,
  }
}

export const createSurveyContentFormatOperations = (
  deps: OperationDependencies,
) => {
  const { update, updateSetting } = createSectionOperations(deps, {
    section: 'contentFormat',
    update: (s, u) => s.updateContentFormat(u),
    setProperty: (s, k, v) => s.setContentFormatProperty(k, v),
  })
  return {
    updateSurveyContentFormat: update,
    updateSurveyContentFormatSetting: updateSetting,
  }
}
