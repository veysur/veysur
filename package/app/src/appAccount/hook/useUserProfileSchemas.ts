import { useMemo, useCallback } from 'react'

import {
  createSchemaDisableTwoFactor,
  createSchemaUserProfileEmail,
  createSchemaUserProfilePassword,
} from '../model'
import { getUserProfileApi } from '../registry'

export function useUserProfileSchemas() {
  // Validation callbacks that handle auth refresh before API calls
  const validatePasswordCurrent = useCallback(
    async (password: string): Promise<true | string> => {
      const isValid =
        await getUserProfileApi().validatePasswordCurrent(password)
      return isValid ? true : 'Current password is incorrect'
    },
    [],
  )

  const validateEmailNotRegistered = useCallback(
    async (email: string): Promise<true | string> => {
      const isAvailable =
        await getUserProfileApi().validateEmailNotRegistered(email)
      return isAvailable ? true : 'This email is already registered'
    },
    [],
  )

  // Create schemas with validation callbacks
  const schemaUserProfileEmail = useMemo(
    () =>
      createSchemaUserProfileEmail({
        validateEmailNotRegistered,
        validatePasswordCurrent,
      }),
    [validateEmailNotRegistered, validatePasswordCurrent],
  )

  const schemaUserProfilePassword = useMemo(
    () =>
      createSchemaUserProfilePassword({
        validatePasswordCurrent,
      }),
    [validatePasswordCurrent],
  )

  const schemaDisableTwoFactor = useMemo(
    () => createSchemaDisableTwoFactor({ validatePasswordCurrent }),
    [validatePasswordCurrent],
  )

  return {
    schemaUserProfileEmail,
    schemaUserProfilePassword,
    schemaDisableTwoFactor,
  }
}
