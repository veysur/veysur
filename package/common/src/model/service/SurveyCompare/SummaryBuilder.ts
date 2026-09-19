import { SurveyComparisonResult } from './types'

/**
 * Builds summary statistics from comparison results
 */
export class SummaryBuilder {
  /**
   * Build summary statistics from differences
   */
  build(
    differences: SurveyComparisonResult['differences'],
  ): SurveyComparisonResult['summary'] {
    let addedItems = 0
    let removedItems = 0
    let modifiedItems = 0

    differences.collections.forEach((diff) => {
      if (diff.type === 'added') addedItems++
      else if (diff.type === 'removed') removedItems++
      else if (diff.type === 'modified') modifiedItems++
    })

    const reorderedCollections =
      (differences.reordering.groups ? 1 : 0) +
      (differences.reordering.questions ? 1 : 0)

    const totalChanges =
      differences.fields.length +
      differences.l10n.length +
      differences.collections.length +
      differences.participantAttributes.length +
      differences.participantAttributesL10n.length +
      reorderedCollections

    return {
      totalChanges,
      addedItems,
      removedItems,
      modifiedItems,
      reorderedCollections,
    }
  }
}
