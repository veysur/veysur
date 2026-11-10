export const KEY_STATE_AUTH = 'auth'
export const KEY_STATE_SURVEY_AUTH = 'surveyAuth'
export const KEY_STATE_REDIRECT_PENDING = 'redirectPending'
export const KEY_STATE_REMEMBER_ME = 'rememberMe'

/**
 * Set at signup: auth is held in localStorage until email verification completes, so a
 * verification link opened in a new tab is still signed in. Value is the intended
 * remember-me choice, applied once verification succeeds.
 */
export const KEY_STATE_SIGNUP_REMEMBER_PENDING = 'signupRememberPending'

export const KEY_STATE_COOKIE_CONSENT = 'cookieConsent'

export const KEY_STATE_2FA_PROMPTED = '2faPrompted'

/** Active project resolved from the auth/subdomain — see hook/useProjectDomain. */
export const KEY_STATE_PROJECT_DOMAIN = 'projectDomain'

/** localStorage key used for the cross-domain auth handoff (popup → main window) */
export const KEY_STORAGE_AUTH_HANDOFF = 'veysur.authHandoff'
