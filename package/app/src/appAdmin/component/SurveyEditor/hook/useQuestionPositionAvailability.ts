import { useMemo } from 'react'
import {
  Survey,
  SurveyEntity,
  SurveyQuestion,
  QuestionInfo,
} from 'veysur-common'

/**
 * Shared by `useTextExpressionVariablePicker` and `ConditionEditor`: given
 * the entity a text field or condition belongs to, computes its position in
 * survey order and the forward-reference-safe subset of `questionsInfo`
 * available to it (only questions/groups strictly before that position).
 * Previously duplicated independently in both call sites - kept in sync only
 * by a doc-comment cross-reference, with no compiler or test to catch drift
 * between them.
 *
 * `entity` is duck-typed on `groupId` presence (question vs. group) rather
 * than an `instanceof` check, matching the pre-existing behaviour of both
 * call sites - only `SurveyQuestion` and `SurveySection` are meaningful
 * here; the wider `SurveyEntity` union exists because `ConditionEditor`'s
 * prop type is `SurveyEntity` (it is only ever actually invoked with a
 * question or group, from `QuestionView`/`QuestionGroupView`).
 *
 * @param entity - The question or group this field/condition belongs to.
 *   Pass `'end'` for a field with no forward-reference restriction (the
 *   thank-you message, which renders after every question is answered), or
 *   `'start'` for a field that renders before every question (the welcome
 *   message) - every question is then a forward reference.
 */
export function useQuestionPositionAvailability(
  survey: Survey | undefined,
  entity: SurveyEntity | 'end' | 'start' | null,
  questionsInfo: QuestionInfo[],
): { currentPosition: number; availableQuestions: QuestionInfo[] } {
  const currentPosition = useMemo((): number => {
    if (!survey || !entity) return 0
    if (entity === 'start') return 0
    if (entity === 'end') return questionsInfo.length

    if ((entity as SurveyQuestion).sectionId !== undefined) {
      const questionIndex = survey.elements
        .questions()
        .findIndex((q) => q._id === entity._id)
      if (questionIndex >= 0) return questionIndex
      // A content element carries `groupId` too but is not in `survey.elements.questions()`.
      // Its position is the number of questions before it in element order.
      const elementPos = survey.elementIds.indexOf(entity._id)
      if (elementPos <= 0) return 0
      const precedingElementIds = new Set(
        survey.elementIds.slice(0, elementPos),
      )
      return survey.elements
        .questions()
        .filter((q) => precedingElementIds.has(q._id)).length
    }

    const groupIndex = survey.sectionIds.indexOf(entity._id)
    if (groupIndex <= 0) return 0
    const precedingGroupIds = new Set(survey.sectionIds.slice(0, groupIndex))
    return survey.elements
      .questions()
      .filter((q) => q.sectionId && precedingGroupIds.has(q.sectionId)).length
  }, [survey, entity, questionsInfo.length])

  const availableQuestions = useMemo((): QuestionInfo[] => {
    if (!survey || !entity) return questionsInfo
    if (entity === 'start') return []
    if (entity === 'end') return questionsInfo

    if ((entity as SurveyQuestion).sectionId !== undefined) {
      return questionsInfo.filter((q) => q.position < currentPosition)
    }

    const groupIndex = survey.sectionIds.indexOf(entity._id)
    if (groupIndex <= 0) return []
    const precedingGroupIds = new Set(survey.sectionIds.slice(0, groupIndex))
    const precedingQuestionCodes = new Set(
      survey.elements
        .questions()
        .filter((q) => q.sectionId && precedingGroupIds.has(q.sectionId))
        .map((q) => q.code),
    )
    return questionsInfo.filter((q) => precedingQuestionCodes.has(q.code))
  }, [questionsInfo, survey, entity, currentPosition])

  return { currentPosition, availableQuestions }
}
