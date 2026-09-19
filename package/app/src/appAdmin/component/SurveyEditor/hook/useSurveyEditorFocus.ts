import { useCallback } from 'react'
import { Survey } from 'veysur-common'

import {
  SURVEY_ENTITY_TYPE_SURVEY_TYPES,
  SURVEY_ENTITY_TYPE_ELEMENT,
  SURVEY_ENTITY_TYPE_SECTION,
  SURVEY_ENTITY_TYPE_ANSWER_OPTION,
  SURVEY_ENTITY_TYPE_SUBQUESTION,
  SURVEY_ENTITY_TYPE_CONTENT,
} from '../constant'
import { SurveyEntityType } from '../type'
import { useSurveyEditorStore } from './useSurveyEditorStore'

export type SurveyFocus = {
  entityType: SurveyEntityType
  id?: string
  parentId?: string
} | null

export type SetSurveyFocus = (focus: SurveyFocus) => void

export function useSurveyEditorFocus() {
  const surveyFocus = useSurveyEditorStore((state) => state.surveyFocus)
  const setSurveyFocus = useSurveyEditorStore((state) => state.setSurveyFocus)

  const getFocusedEntity = useCallback(
    (survey: Survey) => {
      // Handle answer options
      if (
        surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ANSWER_OPTION &&
        surveyFocus?.parentId
      ) {
        const question = survey?.elements.getQuestionById(surveyFocus.parentId)
        const answerOption = question?.answerOptions?.find(
          (ao) => ao._id === surveyFocus.id,
        )
        return answerOption
      }

      // Handle subquestions
      if (
        surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SUBQUESTION &&
        surveyFocus?.parentId
      ) {
        const question = survey?.elements.getQuestionById(surveyFocus.parentId)
        return question?.subquestions?.find((sq) => sq._id === surveyFocus.id)
      }

      // Handle questions
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_ELEMENT) {
        return surveyFocus?.id
          ? survey?.elements.getQuestionById(surveyFocus.id)
          : undefined
      }

      // Handle content elements
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_CONTENT) {
        return survey?.contents?.find((el) => el._id === surveyFocus?.id)
      }

      // Handle groups
      if (surveyFocus?.entityType === SURVEY_ENTITY_TYPE_SECTION) {
        return survey?.sections
          .groups()
          ?.find((group) => group._id === surveyFocus?.id)
      }

      // Handle survey-level entities
      if (
        surveyFocus?.entityType &&
        (SURVEY_ENTITY_TYPE_SURVEY_TYPES as readonly string[]).includes(
          surveyFocus.entityType,
        )
      ) {
        return survey
      }

      return undefined
    },
    [surveyFocus],
  )

  return { surveyFocus, setSurveyFocus, getFocusedEntity }
}
