const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

/**
 * Throws if the email address is not well-formed.
 */
export function validateEmail(email: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format')
  }
}
