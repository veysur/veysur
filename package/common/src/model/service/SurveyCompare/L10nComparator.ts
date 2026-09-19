import { L10n } from '../../constructor/L10n'
import { L10nDifference } from './types'

/**
 * Handles comparison of L10n (localization) objects
 */
export class L10nComparator {
  /**
   * Compare two L10n objects and return differences
   */
  compare(path: string, l10nA: L10n, l10nB: L10n): L10nDifference[] {
    const differences: L10nDifference[] = []
    const allLanguages = this.getAllLanguages(l10nA, l10nB)

    allLanguages.forEach((lang) => {
      const valueA = l10nA[lang] as string | undefined
      const valueB = l10nB[lang] as string | undefined

      if (valueA === undefined && valueB !== undefined) {
        differences.push({
          path,
          type: 'added',
          language: lang,
          newValue: valueB,
        })
      } else if (valueA !== undefined && valueB === undefined) {
        differences.push({
          path,
          type: 'removed',
          language: lang,
          oldValue: valueA,
        })
      } else if (valueA !== valueB) {
        differences.push({
          path,
          type: 'modified',
          language: lang,
          oldValue: valueA,
          newValue: valueB,
        })
      }
    })

    return differences
  }

  /**
   * Get all language codes from both L10n objects
   */
  private getAllLanguages(l10nA: L10n, l10nB: L10n): Set<string> {
    const allLanguages = new Set<string>()

    Object.keys(l10nA).forEach((key) => {
      if (typeof l10nA[key] === 'string') {
        allLanguages.add(key)
      }
    })

    Object.keys(l10nB).forEach((key) => {
      if (typeof l10nB[key] === 'string') {
        allLanguages.add(key)
      }
    })

    return allLanguages
  }
}
