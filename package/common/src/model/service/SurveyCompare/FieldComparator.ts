import { FieldDifference } from './types'
import { isEqual } from 'util/isEqual'

/**
 * Handles deep comparison of nested objects and fields
 */
export class FieldComparator {
  /**
   * Deep compare nested objects and return field differences
   */
  compareNestedObject(
    pathPrefix: string,
    objA: Record<string, unknown> | null | undefined,
    objB: Record<string, unknown> | null | undefined,
  ): FieldDifference[] {
    const differences: FieldDifference[] = []

    // Handle null/undefined cases
    if (objA === objB) return differences

    if (objA == null && objB != null) {
      differences.push({
        path: pathPrefix,
        type: 'added',
        newValue: objB,
      })
      return differences
    }

    if (objA != null && objB == null) {
      differences.push({
        path: pathPrefix,
        type: 'removed',
        oldValue: objA,
      })
      return differences
    }

    // Get all keys
    const allKeys = new Set([
      ...Object.keys(objA || {}),
      ...Object.keys(objB || {}),
    ])

    allKeys.forEach((key) => {
      const valueA = objA?.[key]
      const valueB = objB?.[key]
      const currentPath = `${pathPrefix}.${key}`

      if (
        typeof valueA === 'object' &&
        typeof valueB === 'object' &&
        valueA !== null &&
        valueB !== null &&
        !Array.isArray(valueA) &&
        !Array.isArray(valueB)
      ) {
        // Recursively compare nested objects
        const nestedDiffs = this.compareNestedObject(
          currentPath,
          valueA as Record<string, unknown>,
          valueB as Record<string, unknown>,
        )
        differences.push(...nestedDiffs)
      } else if (!isEqual(valueA, valueB)) {
        if (valueA === undefined || valueA === null) {
          differences.push({
            path: currentPath,
            type: 'added',
            newValue: valueB,
          })
        } else if (valueB === undefined || valueB === null) {
          differences.push({
            path: currentPath,
            type: 'removed',
            oldValue: valueA,
          })
        } else {
          differences.push({
            path: currentPath,
            type: 'modified',
            oldValue: valueA,
            newValue: valueB,
          })
        }
      }
    })

    return differences
  }
}
