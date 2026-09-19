import * as Sentry from '@sentry/node'

/**
 * Report an error to BugSink (Sentry) under an explicit grouping fingerprint so
 * repeated occurrences of the same episode collapse into one issue (and one
 * Slack notification). Pass `undefined`/empty to capture without overriding the
 * default fingerprint.
 */
export function captureWithFingerprint(
  fingerprint: string[] | undefined,
  error: Error,
): void {
  Sentry.withScope((scope) => {
    if (fingerprint && fingerprint.length > 0) {
      scope.setFingerprint(fingerprint)
    }
    Sentry.captureException(error)
  })
}
