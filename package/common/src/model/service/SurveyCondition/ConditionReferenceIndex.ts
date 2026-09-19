import { Survey } from '../../constructor/Survey'
import { ConditionParser } from './ConditionParser'

export type ConditionOwnerEntityType = 'question' | 'group'

export interface ConditionOwnerRef {
  entityType: ConditionOwnerEntityType
  entityId: string
  code: string
  condition: string
}

/**
 * Reverse lookup from a referenced code (e.g. `Q001`, `Q001.A002`, `Q001.S001.A002`)
 * to every question/group condition that references it. Built from each entity's
 * cached `conditionReferences` field so conditions don't need to be re-parsed.
 */
export class ConditionReferenceIndex {
  private byCode = new Map<string, ConditionOwnerRef[]>()
  private owners: ConditionOwnerRef[] = []

  static build(survey: Survey): ConditionReferenceIndex {
    const index = new ConditionReferenceIndex()

    for (const group of survey.sections.groups()) {
      if (!group.condition) continue
      const references =
        group.conditionReferences ??
        ConditionParser.getReferencedCodes(group.condition)
      index.addOwner(
        {
          entityType: 'group',
          entityId: group._id,
          code: group.code,
          condition: group.condition,
        },
        references,
      )
    }

    for (const question of survey.elements.questions()) {
      if (!question.condition) continue
      const references =
        question.conditionReferences ??
        ConditionParser.getReferencedCodes(question.condition)
      index.addOwner(
        {
          entityType: 'question',
          entityId: question._id,
          code: question.code,
          condition: question.condition,
        },
        references,
      )
    }

    return index
  }

  private addOwner(owner: ConditionOwnerRef, references: string[]): void {
    this.owners.push(owner)
    for (const reference of references) {
      const existing = this.byCode.get(reference) ?? []
      existing.push(owner)
      this.byCode.set(reference, existing)
    }
  }

  /**
   * Finds every condition owner that references `targetCode`, exactly or via a
   * dot-prefixed child reference (e.g. deleting `Q001` should also surface a
   * condition referencing `Q001.A001`).
   */
  findReferencingOwners(targetCode: string): ConditionOwnerRef[] {
    const matches: ConditionOwnerRef[] = []
    const seen = new Set<ConditionOwnerRef>()

    for (const [code, owners] of this.byCode) {
      if (code === targetCode || code.startsWith(`${targetCode}.`)) {
        for (const owner of owners) {
          if (!seen.has(owner)) {
            seen.add(owner)
            matches.push(owner)
          }
        }
      }
    }

    return matches
  }

  /**
   * Finds owners referencing a specific matrix cell (`questionCode.subquestionCode.*`),
   * since removing a subquestion doesn't correspond to a simple code prefix match —
   * the subquestion code appears as the middle segment, with any answer option code
   * following it.
   */
  findReferencingOwnersBySubquestion(
    questionCode: string,
    subquestionCode: string,
  ): ConditionOwnerRef[] {
    const matches: ConditionOwnerRef[] = []
    const seen = new Set<ConditionOwnerRef>()

    for (const [code, owners] of this.byCode) {
      const segments = code.split('.')
      if (
        segments.length === 3 &&
        segments[0] === questionCode &&
        segments[1] === subquestionCode
      ) {
        for (const owner of owners) {
          if (!seen.has(owner)) {
            seen.add(owner)
            matches.push(owner)
          }
        }
      }
    }

    return matches
  }

  /**
   * Finds owners referencing a specific matrix answer option (`questionCode.*.answerOptionCode`),
   * since the answer option code is now the last segment of a matrix cell reference
   * and can't be found via the `questionCode.answerOptionCode` prefix match that
   * {@link findReferencingOwners} uses for non-matrix answer-option references.
   */
  findReferencingOwnersByAnswerOption(
    questionCode: string,
    answerOptionCode: string,
  ): ConditionOwnerRef[] {
    const matches: ConditionOwnerRef[] = []
    const seen = new Set<ConditionOwnerRef>()

    for (const [code, owners] of this.byCode) {
      const segments = code.split('.')
      if (
        segments.length === 3 &&
        segments[0] === questionCode &&
        segments[2] === answerOptionCode
      ) {
        for (const owner of owners) {
          if (!seen.has(owner)) {
            seen.add(owner)
            matches.push(owner)
          }
        }
      }
    }

    return matches
  }
}
