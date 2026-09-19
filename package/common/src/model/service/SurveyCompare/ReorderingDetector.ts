import { Survey } from '../../constructor/Survey'

/**
 * Handles detection of reordering in groups and questions
 */
export class ReorderingDetector {
  /**
   * Detect if groups have been reordered
   */
  detectGroupReordering(
    surveyA: Survey,
    surveyB: Survey,
  ): { oldOrder: string[]; newOrder: string[] } | undefined {
    // Convert groupIds to group codes
    const groupCodesA = surveyA.sectionIds
      .map((id) => {
        const group = surveyA.sections.groups().find((g) => g._id === id)
        return group?.code
      })
      .filter((code): code is string => code !== undefined)

    const groupCodesB = surveyB.sectionIds
      .map((id) => {
        const group = surveyB.sections.groups().find((g) => g._id === id)
        return group?.code
      })
      .filter((code): code is string => code !== undefined)

    if (this.isReordered(groupCodesA, groupCodesB)) {
      return {
        oldOrder: groupCodesA,
        newOrder: groupCodesB,
      }
    }

    return undefined
  }

  /**
   * Detect if questions have been reordered
   */
  detectQuestionReordering(
    surveyA: Survey,
    surveyB: Survey,
  ): { oldOrder: string[]; newOrder: string[] } | undefined {
    // Convert questionIds to question codes
    const questionCodesA = surveyA.elementIds
      .map((id) => {
        const question = surveyA.elements.questions().find((q) => q._id === id)
        return question?.code
      })
      .filter((code): code is string => code !== undefined)

    const questionCodesB = surveyB.elementIds
      .map((id) => {
        const question = surveyB.elements.questions().find((q) => q._id === id)
        return question?.code
      })
      .filter((code): code is string => code !== undefined)

    if (this.isReordered(questionCodesA, questionCodesB)) {
      return {
        oldOrder: questionCodesA,
        newOrder: questionCodesB,
      }
    }

    return undefined
  }

  /**
   * Check if two arrays have same elements but different order
   */
  private isReordered(arrayA: string[], arrayB: string[]): boolean {
    // Must have same length
    if (arrayA.length !== arrayB.length) return false

    // Must have same elements (sorted arrays should be equal)
    const sortedA = [...arrayA].sort()
    const sortedB = [...arrayB].sort()
    if (JSON.stringify(sortedA) !== JSON.stringify(sortedB)) return false

    // Must have different order (original arrays should be different)
    return JSON.stringify(arrayA) !== JSON.stringify(arrayB)
  }
}
