import { Survey } from '../../constructor/Survey'
import { SurveyQuestion } from '../../constructor/Survey/SurveyQuestion'
import { isMatrixQuestionType } from '../../constructor/Survey/Matrix'
import { isMultiPartQuestionType } from '../../constructor/Survey/MultiPart'
import {
  ConditionOwnerRef,
  ConditionReferenceIndex,
} from './ConditionReferenceIndex'
import { questionTypeHasReferenceableAnswerOptions } from './answerOptionReferenceability'
import { buildAnswerOptionCodesForQuestion } from './predefinedAnswerOptions'

export interface StructuralChangeImpact {
  impacted: boolean
  affectedConditions: ConditionOwnerRef[]
}

function noImpact(): StructuralChangeImpact {
  return { impacted: false, affectedConditions: [] }
}

function toImpact(owners: ConditionOwnerRef[]): StructuralChangeImpact {
  return { impacted: owners.length > 0, affectedConditions: owners }
}

/**
 * Orders questions by their current group order (survey.sectionIds), preserving
 * each question's relative position within its group. This is used instead of
 * relying on `survey.elements.questionList()` being pre-sorted, since a group reorder alone
 * does not resort the flat questions array.
 */
function buildFlatQuestionOrder(survey: Survey): SurveyQuestion[] {
  const byGroup = new Map<string, SurveyQuestion[]>()
  for (const question of survey.elements.questionList()) {
    const list = byGroup.get(question.sectionId) ?? []
    list.push(question)
    byGroup.set(question.sectionId, list)
  }

  const ordered: SurveyQuestion[] = []
  for (const groupId of survey.sectionIds) {
    ordered.push(...(byGroup.get(groupId) ?? []))
  }
  return ordered
}

function buildPositions(survey: Survey): {
  questionPositions: Map<string, number>
  groupPositions: Map<string, number>
} {
  const orderedQuestions = buildFlatQuestionOrder(survey)
  const questionPositions = new Map<string, number>()
  const groupPositions = new Map<string, number>()

  orderedQuestions.forEach((question, index) => {
    questionPositions.set(question._id, index)
    if (!groupPositions.has(question.sectionId)) {
      groupPositions.set(question.sectionId, index)
    }
  })

  // Groups with no questions have no natural position from the questions list;
  // fall back to their index in groupIds so they still compare consistently.
  survey.sectionIds.forEach((groupId, index) => {
    if (!groupPositions.has(groupId)) {
      groupPositions.set(groupId, orderedQuestions.length + index)
    }
  })

  return { questionPositions, groupPositions }
}

/**
 * Answer option codes addressable by a condition if the question were of the
 * given type (predefined codes, or its stored `answerOptions`/`OTHER` codes
 * when that type actually supports them) - empty if the type has neither.
 * Used to diff before/after a type change, since `updateQuestion` does not
 * prune `answerOptions` on a type change.
 */
function referenceableCodesForType(
  type: string,
  question: SurveyQuestion,
): string[] {
  if (!questionTypeHasReferenceableAnswerOptions(type)) return []
  return buildAnswerOptionCodesForQuestion({
    type,
    answerOptions: question.answerOptions,
    attributes: question.attributes,
  })
}

function ownerPosition(
  owner: ConditionOwnerRef,
  positions: {
    questionPositions: Map<string, number>
    groupPositions: Map<string, number>
  },
): number | undefined {
  return owner.entityType === 'question'
    ? positions.questionPositions.get(owner.entityId)
    : positions.groupPositions.get(owner.entityId)
}

export class SurveyStructuralChangeImpact {
  static checkAnswerOptionRemoval(
    survey: Survey,
    questionId: string,
    answerOptionCode: string,
  ): StructuralChangeImpact {
    const question = survey.elements
      .questionList()
      .find((q) => q._id === questionId)
    if (!question) return noImpact()

    const index = ConditionReferenceIndex.build(survey)
    const targetCode = `${question.code}.${answerOptionCode}`
    const owners = index.findReferencingOwners(targetCode)

    // Matrix cell references (Q001.S001.A001) put the answer option code last,
    // so they aren't found by the questionCode.answerOptionCode prefix match
    // above - check for those separately. This is safe to run unconditionally:
    // a non-matrix question simply has no matrix-cell-shaped references to find.
    const matrixOwners = index.findReferencingOwnersByAnswerOption(
      question.code,
      answerOptionCode,
    )
    const seen = new Set(owners)
    for (const owner of matrixOwners) {
      if (!seen.has(owner)) {
        seen.add(owner)
        owners.push(owner)
      }
    }

    return toImpact(owners)
  }

  static checkSubquestionRemoval(
    survey: Survey,
    questionId: string,
    subquestionId: string,
  ): StructuralChangeImpact {
    const question = survey.elements
      .questionList()
      .find((q) => q._id === questionId)
    if (!question) return noImpact()

    const subquestion = question.subquestions?.find(
      (s) => s._id === subquestionId,
    )
    if (!subquestion) return noImpact()

    const index = ConditionReferenceIndex.build(survey)
    return toImpact(
      index.findReferencingOwnersBySubquestion(question.code, subquestion.code),
    )
  }

  static checkQuestionTypeChange(
    survey: Survey,
    questionId: string,
    newType: string,
  ): StructuralChangeImpact {
    const before = survey.elements
      .questionList()
      .find((q) => q._id === questionId)
    if (!before) return noImpact()
    if (before.type === newType) return noImpact()

    // `updateQuestion` does not prune `answerOptions`/`subquestions` on a type
    // change — they remain in the data model but stop being addressable by a
    // condition once the new type no longer supports that kind of reference.
    const beforeAnswerOptionCodes = new Set(
      referenceableCodesForType(before.type, before),
    )
    const afterAnswerOptionCodes = new Set(
      referenceableCodesForType(newType, before),
    )
    const droppedAnswerOptionCodes = [...beforeAnswerOptionCodes].filter(
      (code) => !afterAnswerOptionCodes.has(code),
    )
    const newTypeDropsAnswerOptionSupport = droppedAnswerOptionCodes.length > 0

    // Matrix and Multi-Part addressing differ (Q.S.A vs Q.P), so a change
    // that crosses between the two families - not just out of either one -
    // drops subquestion/part references too.
    const hadSubquestionSupport =
      isMatrixQuestionType(before.type) || isMultiPartQuestionType(before.type)
    const stillHasSameSubquestionSupport =
      (isMatrixQuestionType(before.type) && isMatrixQuestionType(newType)) ||
      (isMultiPartQuestionType(before.type) && isMultiPartQuestionType(newType))
    const newTypeDropsSubquestionSupport =
      hadSubquestionSupport &&
      !stillHasSameSubquestionSupport &&
      (before.subquestions?.length ?? 0) > 0

    if (!newTypeDropsAnswerOptionSupport && !newTypeDropsSubquestionSupport) {
      return noImpact()
    }

    const index = ConditionReferenceIndex.build(survey)
    const affected: ConditionOwnerRef[] = []
    const seen = new Set<ConditionOwnerRef>()

    const addAll = (owners: ConditionOwnerRef[]) => {
      for (const owner of owners) {
        if (!seen.has(owner)) {
          seen.add(owner)
          affected.push(owner)
        }
      }
    }

    if (newTypeDropsAnswerOptionSupport) {
      for (const code of droppedAnswerOptionCodes) {
        addAll(index.findReferencingOwners(`${before.code}.${code}`))
        // Matrix cell references (Q001.S001.A001) put the answer option code
        // last, so they aren't found by the prefix match above - check
        // separately. Safe to run unconditionally: a non-matrix question has
        // no matrix-cell-shaped references to find.
        addAll(index.findReferencingOwnersByAnswerOption(before.code, code))
      }
    }
    if (newTypeDropsSubquestionSupport) {
      for (const subquestion of before.subquestions ?? []) {
        addAll(
          index.findReferencingOwnersBySubquestion(
            before.code,
            subquestion.code,
          ),
        )
      }
    }

    return toImpact(affected)
  }

  static checkQuestionMove(
    survey: Survey,
    questionId: string,
    targetGroupId: string,
    newIndex: number,
  ): StructuralChangeImpact {
    return this.checkImpactOfQuestionMove(survey, questionId, (s) =>
      s.moveQuestion(questionId, targetGroupId, newIndex),
    )
  }

  /** Same check as {@link checkQuestionMove}, for the `moveQuestionUp` shorthand. */
  static checkQuestionMoveUp(
    survey: Survey,
    questionId: string,
  ): StructuralChangeImpact {
    return this.checkImpactOfQuestionMove(survey, questionId, (s) =>
      s.moveQuestionUp(questionId),
    )
  }

  /** Same check as {@link checkQuestionMove}, for the `moveQuestionDown` shorthand. */
  static checkQuestionMoveDown(
    survey: Survey,
    questionId: string,
  ): StructuralChangeImpact {
    return this.checkImpactOfQuestionMove(survey, questionId, (s) =>
      s.moveQuestionDown(questionId),
    )
  }

  private static checkImpactOfQuestionMove(
    survey: Survey,
    questionId: string,
    simulateMove: (survey: Survey) => Survey,
  ): StructuralChangeImpact {
    const question = survey.elements
      .questionList()
      .find((q) => q._id === questionId)
    if (!question) return noImpact()

    const index = ConditionReferenceIndex.build(survey)
    const owners = index.findReferencingOwners(question.code)
    if (owners.length === 0) return noImpact()

    const after = simulateMove(survey)
    const afterPositions = buildPositions(after)
    const afterMovedPosition = afterPositions.questionPositions.get(questionId)
    if (afterMovedPosition === undefined) return noImpact()

    const affected = owners.filter((owner) => {
      const afterOwnerPosition = ownerPosition(owner, afterPositions)
      return (
        afterOwnerPosition !== undefined &&
        afterMovedPosition >= afterOwnerPosition
      )
    })

    return toImpact(affected)
  }

  static checkQuestionGroupMove(
    survey: Survey,
    groupId: string,
    newIndex: number,
  ): StructuralChangeImpact {
    const questionsInGroup = survey.elements
      .questionList()
      .filter((q) => q.sectionId === groupId)
    if (questionsInGroup.length === 0) return noImpact()

    const index = ConditionReferenceIndex.build(survey)
    const seen = new Set<ConditionOwnerRef>()
    const ownersByQuestionId = new Map<string, ConditionOwnerRef[]>()
    for (const question of questionsInGroup) {
      const owners = index.findReferencingOwners(question.code)
      if (owners.length > 0) {
        ownersByQuestionId.set(question._id, owners)
        for (const owner of owners) seen.add(owner)
      }
    }
    if (seen.size === 0) return noImpact()

    const after = survey.moveSection(groupId, newIndex)
    const afterPositions = buildPositions(after)

    const affected: ConditionOwnerRef[] = []
    const addedOwners = new Set<ConditionOwnerRef>()

    for (const question of questionsInGroup) {
      const owners = ownersByQuestionId.get(question._id)
      if (!owners) continue

      const afterMovedPosition = afterPositions.questionPositions.get(
        question._id,
      )
      if (afterMovedPosition === undefined) continue

      for (const owner of owners) {
        if (addedOwners.has(owner)) continue
        const afterOwnerPosition = ownerPosition(owner, afterPositions)
        if (
          afterOwnerPosition !== undefined &&
          afterMovedPosition >= afterOwnerPosition
        ) {
          addedOwners.add(owner)
          affected.push(owner)
        }
      }
    }

    return toImpact(affected)
  }
}
