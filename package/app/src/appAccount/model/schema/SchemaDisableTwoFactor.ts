import { Schema, sb } from '@datacapy/schema'

export type DisableTwoFactorFormData = {
  password: string
}

export interface DisableTwoFactorValidators {
  validatePasswordCurrent: (password: string) => Promise<true | string>
}

export function createSchemaDisableTwoFactor(
  validators: DisableTwoFactorValidators,
) {
  return new Schema(
    sb
      .object()
      .shape({
        password: sb
          .string()
          .notEmpty({ message: 'Password is required' })
          .validate(async (value) => validators.validatePasswordCurrent(value)),
      })
      .build(),
  )
}
