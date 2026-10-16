// Not prefixed `veysur.`: clearVeysurStorage() sweeps that prefix on logout,
// which must not reset a participant's completion record.
const KEY_PREFIX = 'veysur_done_'

export function completedStorageKey(surveyId: string): string {
  return `${KEY_PREFIX}${surveyId}`
}

/**
 * True when this browser has already completed the survey. localStorage is
 * origin-scoped, and partitioned per embedding site inside an iframe.
 */
export function hasCompleted(surveyId: string): boolean {
  try {
    return window.localStorage.getItem(completedStorageKey(surveyId)) === '1'
  } catch {
    return false
  }
}

export function markCompleted(surveyId: string): void {
  try {
    window.localStorage.setItem(completedStorageKey(surveyId), '1')
  } catch {
    // Storage blocked: degrade to no repeat protection.
  }
}
