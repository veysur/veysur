import { useMemo } from 'react'
import {
  ConditionValidator,
  ConditionReferenceIndex,
  QuestionInfo,
  Survey,
  SurveyQuestion,
  SurveySection,
  buildQuestionInfoBase,
} from 'veysur-common'

import { useSurveyParticipantAttributeList } from 'appAdmin/component/SurveyParticipant'

import { useSurveyEditorStore } from './useSurveyEditorStore'

export interface ConditionValidity {
  hasCondition: boolean
  isValid: boolean
  errors: string[]
  /** Other conditions elsewhere in the survey that reference this entity and are invalid. */
  invalidReferencingConditions: string[]
}

function buildQuestionsInfo(survey: Survey): QuestionInfo[] {
  return survey.elements
    .questions()
    .map((question, index) => buildQuestionInfoBase(question, index))
}

/**
 * Live validity of a question/group's own condition, plus whether any other
 * condition elsewhere in the survey that references this entity is itself
 * invalid (e.g. this answer option was deleted after the referencing
 * condition was written). Runs a single-entity `ConditionValidator.validate`
 * against the *live* current survey, which is cheap - the same cost
 * `ConditionEditor` already pays on every open.
 */
export function useConditionValidity(
  entity: SurveyQuestion | SurveySection,
): ConditionValidity {
  const survey = useSurveyEditorStore((state) => state.survey)
  const { systemAttributes, customAttributes } =
    useSurveyParticipantAttributeList(survey?._id || '')

  const participantVariableNames = useMemo(
    () =>
      new Set([...systemAttributes, ...customAttributes].map((a) => a.name)),
    [systemAttributes, customAttributes],
  )

  return useMemo((): ConditionValidity => {
    const empty: ConditionValidity = {
      hasCondition: false,
      isValid: true,
      errors: [],
      invalidReferencingConditions: [],
    }
    if (!survey) return empty

    const isQuestion = (entity as SurveyQuestion).sectionId !== undefined
    const questionsInfo = buildQuestionsInfo(survey)

    let position = 0
    if (isQuestion) {
      const idx = survey.elements
        .questions()
        .findIndex((q) => q._id === entity._id)
      position = idx >= 0 ? idx : 0
    } else {
      const groupIndex = survey.sectionIds.indexOf(entity._id)
      if (groupIndex > 0) {
        const precedingGroupIds = new Set(
          survey.sectionIds.slice(0, groupIndex),
        )
        position = survey.elements
          .questions()
          .filter(
            (q) => q.sectionId && precedingGroupIds.has(q.sectionId),
          ).length
      }
    }

    const hasCondition = !!entity.condition && entity.condition.trim() !== ''
    const ownValidation = hasCondition
      ? ConditionValidator.validate(
          entity.condition,
          questionsInfo,
          position,
          participantVariableNames,
        )
      : { isValid: true, errors: [] }

    // Check whether any condition elsewhere that references this entity's
    // code is itself invalid. Owner position: for a question owner, its
    // index in the questions list; for a group owner, the position of the
    // first question in that group (matching SurveyValidation's approach).
    const groupFirstQuestionPosition = new Map<string, number>()
    survey.elements.questions().forEach((q, idx) => {
      if (q.sectionId && !groupFirstQuestionPosition.has(q.sectionId)) {
        groupFirstQuestionPosition.set(q.sectionId, idx)
      }
    })

    const referenceIndex = ConditionReferenceIndex.build(survey)
    const referencingOwners = referenceIndex.findReferencingOwners(entity.code)
    const invalidReferencingConditions = referencingOwners
      .filter((owner) => {
        const ownerPosition =
          owner.entityType === 'question'
            ? (survey.elements
                .questions()
                .findIndex((q) => q._id === owner.entityId) ?? 0)
            : (groupFirstQuestionPosition.get(owner.entityId) ?? 0)
        const result = ConditionValidator.validate(
          owner.condition,
          questionsInfo,
          ownerPosition,
          participantVariableNames,
        )
        return !result.isValid
      })
      .map((owner) => owner.condition)

    return {
      hasCondition,
      isValid: ownValidation.isValid,
      errors: ownValidation.errors,
      invalidReferencingConditions,
    }
  }, [survey, entity, participantVariableNames])
}
