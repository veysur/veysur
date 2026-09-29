import { Schema, sb } from '@datacapy/schema'

export type UserProfileEmailFormData = {
  email: string
  currentPassword: string
}

/**
 * Validation callbacks for email change form.
 * These are provided by the calling code and handle auth refresh before API calls.
 */
export interface UserProfileEmailValidators {
  validateEmailNotRegistered: (email: string) => Promise<true | string>
  validatePasswordCurrent: (password: string) => Promise<true | string>
}

export function createSchemaUserProfileEmail(
  validators: UserProfileEmailValidators,
) {
  return new Schema(
    sb
      .object()
      .shape({
        email: sb
          .string()
          .notEmpty({ message: 'Email is required' })
          .email({ message: 'Invalid email address' })
          .maxLength(255, { message: 'Email must be at most 255 characters' })
          .validate(async (value) =>
            validators.validateEmailNotRegistered(value),
          ),
        currentPassword: sb
          .string()
          .notEmpty({ message: 'Current password is required' })
          .validate(async (value) => validators.validatePasswordCurrent(value)),
      })
      .build(),
  )
}

// Legacy export for backward compatibility (without remote validation)
export const SchemaUserProfileEmail = new Schema(
  sb
    .object()
    .shape({
      email: sb
        .string()
        .notEmpty({ message: 'Email is required' })
        .email({ message: 'Invalid email address' })
        .maxLength(255, { message: 'Email must be at most 255 characters' }),
      currentPassword: sb
        .string()
        .notEmpty({ message: 'Current password is required' }),
    })
    .build(),
)
