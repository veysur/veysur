/**
 * Password validation constants and utilities
 * Used for both client-side and server-side password validation
 */

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_REGEX_NUMBER = /[0-9]/
export const PASSWORD_REGEX_SPECIAL = /[^A-Za-z0-9]/

export const PASSWORD_REQUIREMENTS = [
  'Min 8 characters',
  'At least 1 number',
  'At least 1 special character',
]

/**
 * Validates a password against all requirements
 * Compatible with @datacapy/schema .validate() validator
 *
 * @param password - The password string to validate
 * @returns true if valid, error message string if invalid
 */
export function validatePassword(password: string): true | string {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }

  if (!PASSWORD_REGEX_NUMBER.test(password)) {
    return 'Password must contain at least 1 number'
  }

  if (!PASSWORD_REGEX_SPECIAL.test(password)) {
    return 'Password must contain at least 1 special character'
  }

  return true
}
