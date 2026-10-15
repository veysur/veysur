const COOKIE_PREFIX = 'veysur_done_'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function completedCookieName(surveyId: string): string {
  return `${COOKIE_PREFIX}${surveyId}`
}

/** True when this browser has already completed the survey. */
export function hasCompleted(surveyId: string): boolean {
  try {
    const name = completedCookieName(surveyId)
    return document.cookie
      .split(';')
      .some((part) => part.trim() === `${name}=1`)
  } catch {
    return false
  }
}

/**
 * Records completion in a host-only cookie, so it is scoped to the project's
 * own subdomain and never shared with other projects.
 */
export function markCompleted(surveyId: string): void {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie =
      `${completedCookieName(surveyId)}=1; Path=/; ` +
      `Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`
  } catch {
    // Cookies blocked: degrade to no repeat protection.
  }
}
