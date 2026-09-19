/**
 * Deep equality comparison for primitives, arrays, and objects
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal, false otherwise
 *
 * @example
 * isEqual(1, 1) // true
 * isEqual('hello', 'hello') // true
 * isEqual([1, 2, 3], [1, 2, 3]) // true
 * isEqual({ a: 1, b: 2 }, { a: 1, b: 2 }) // true
 * isEqual({ a: { b: 1 } }, { a: { b: 1 } }) // true
 * isEqual([1, 2], [1, 3]) // false
 */
export function isEqual(a: unknown, b: unknown): boolean {
  // Same reference or both strictly equal (handles primitives and same object reference)
  if (a === b) return true

  // Handle NaN (NaN !== NaN in JavaScript)
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true
  }

  // One is null/undefined and the other isn't
  if (a == null || b == null) return false

  // Type mismatch
  if (typeof a !== typeof b) return false

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => isEqual(item, b[index]))
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    // Different number of keys
    if (keysA.length !== keysB.length) return false

    // Check all keys and values
    return keysA.every((key) => {
      // Key doesn't exist in b
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      // Recursively compare values
      return isEqual(a[key], b[key])
    })
  }

  // For all other cases (primitives were already handled above)
  return false
}
