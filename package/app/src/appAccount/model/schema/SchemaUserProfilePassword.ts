import { PASSWORD_MIN_LENGTH, validatePassword } from 'veysur-common'
import { Schema, sb } from '@datacapy/schema'

export type UserProfilePasswordFormData = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * Validation callbacks for password change form.
 * These are provided by the calling code and handle auth refresh before API calls.
 */
export interface UserProfilePasswordValidators {
  validatePasswordCurrent: (password: string) => Promise<true | string>
}

export function createSchemaUserProfilePassword(
  validators: UserProfilePasswordValidators,
) {
  const spec = sb
    .object()
    .shape({
      currentPassword: sb
        .string()
        .notEmpty({ message: 'Current password is required' })
        .validate(async (value) => validators.validatePasswordCurrent(value)),
      newPassword: sb
        .string()
        .notEmpty({ message: 'New password is required' })
        .minLength(PASSWORD_MIN_LENGTH, {
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        })
        .validate(validatePassword),
      confirmPassword: sb
        .string()
        .notEmpty({ message: 'Please confirm your password' }),
    })
    .build()

  // Add equality validation for confirmPassword to match newPassword
  spec.confirmPassword.$validate = {
    ...spec.confirmPassword.$validate,
    equality: {
      path: 'newPassword',
      message: 'Passwords do not match',
    },
  }

  return new Schema(spec)
}

// Legacy export for backward compatibility (without remote validation)
export const SchemaUserProfilePassword = new Schema(
  sb
    .object()
    .shape({
      currentPassword: sb
        .string()
        .notEmpty({ message: 'Current password is required' }),
      newPassword: sb
        .string()
        .notEmpty({ message: 'New password is required' })
        .minLength(PASSWORD_MIN_LENGTH, {
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
        })
        .validate(validatePassword),
      confirmPassword: sb
        .string()
        .notEmpty({ message: 'Please confirm your password' }),
    })
    .build(),
)
