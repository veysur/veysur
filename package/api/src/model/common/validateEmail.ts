import { isValidEmail } from 'veysur-common'

export { isValidEmail }

/**
 * Throws if the email address is not well-formed.
 */
export function validateEmail(email: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format')
  }
}
