/**
 * Extract a human-readable message from an unknown thrown/rejected value.
 * `String(err)` is the fallback rather than a generic 'Unknown error' string so
 * a non-Error throw (a plain object, a string) still carries its own detail.
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * The stack trace when the value is an Error, otherwise undefined.
 */
export function errorStack(err: unknown): string | undefined {
  return err instanceof Error ? err.stack : undefined
}
