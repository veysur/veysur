import { SchemaValidationResult } from '@datacapy/schema'

export const extractFieldErrors = (
  errors: SchemaValidationResult['errors'],
  path: string,
): string[] => {
  if (!errors) return ['Validation failed']

  const pathErrors = errors[path]
  if (Array.isArray(pathErrors) && pathErrors.length > 0) {
    return [...new Set(pathErrors)]
  }

  const nestedErrors: string[] = []
  for (const errorPath of Object.keys(errors)) {
    if (errorPath === path || errorPath.startsWith(`${path}.`)) {
      const msgs = errors[errorPath]
      if (Array.isArray(msgs)) nestedErrors.push(...msgs)
    }
  }
  if (nestedErrors.length > 0) return [...new Set(nestedErrors)]

  return [...new Set(Object.values(errors).flat() as string[])]
}
