/**
 * Helper to get nested property value from an object using dot notation
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let value = obj
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return value
}

/**
 * Builds an @datacapy/schema callback validator for a `max` field that checks it
 * against a sibling `min` field. AttributeCard wraps the attribute value
 * under a container keyed by the attribute's own `name`, so `options.root`
 * is that outer container rather than the value object itself - the
 * validator therefore looks the sibling up both directly (unwrapped root,
 * e.g. in unit tests) and under `attributeName` (wrapped root, in the app).
 * A `min` or `max` of 0 is treated as "no limit" and skips the check.
 */
export function validateMaxNotLessThanMin(attributeName: string) {
  return function (value: number, options?: { root?: unknown }) {
    const root = (options?.root ?? {}) as Record<string, unknown>
    const wrapped = root[attributeName] as Record<string, unknown> | undefined
    const min = (root.min ?? wrapped?.min) as number | undefined

    if (value === 0 || min === 0) return true
    if (min !== undefined && min > value) {
      return 'Min cannot be greater than Max'
    }
    return true
  }
}
