export const stripFunctions = function <T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripFunctions) as T
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: Record<string, unknown> = {}
    for (const key in obj) {
      if (typeof obj[key] !== 'function') {
        newObj[key] = stripFunctions(obj[key])
      }
    }
    return newObj as T
  }
  return obj
}
