import type { Schema } from 'mzen-schema'
import { useCallback } from 'react'

import { useSurveyEditorStore } from '../hook/useSurveyEditorStore'

export interface ValidationErrors {
  [entityType: string]: {
    [entityId: string]: {
      [field: string]: string[]
    }
  }
}

export function useSurveyEditorValidation() {
  const validationErrors = useSurveyEditorStore(
    (state) => state.validationErrors,
  )
  const setValidationError = useSurveyEditorStore(
    (state) => state.setValidationError,
  )
  const clearValidationError = useSurveyEditorStore(
    (state) => state.clearValidationError,
  )

  const validateField = useCallback(
    async (
      schema: Schema,
      path: string,
      value: unknown,
      entityType: string,
      entityId: string,
      field: string,
    ): Promise<boolean> => {
      try {
        // Convert dot notation path to nested object for L10n validation
        // e.g., 'title.eng' -> { title: { en: value } }
        const pathParts = path.split('.')
        let validationData: Record<string, unknown>

        if (pathParts.length === 2) {
          // L10n field like 'title.eng'
          validationData = {
            [pathParts[0]]: {
              [pathParts[1]]: value,
            },
          }
        } else {
          // Simple field
          validationData = { [path]: value }
        }

        const { isValid, errors } = await schema.validatePaths(validationData)

        if (isValid) {
          clearValidationError(entityType, entityId, field)
          return true
        } else {
          // Try to extract errors using the original path or nested path
          const firstKey = pathParts[0] as string
          const secondKey = pathParts[1] as string
          const directErrors = errors?.[path]
          const nested = errors?.[firstKey]
          const nestedErrors =
            firstKey && secondKey && nested && !Array.isArray(nested)
              ? nested[secondKey]
              : undefined

          const fieldErrors: string[] = Array.isArray(directErrors)
            ? directErrors
            : (nestedErrors ?? ['Validation failed'])
          setValidationError(entityType, entityId, field, fieldErrors)
          return false
        }
      } catch (error) {
        console.error('Validation error:', error)
        setValidationError(entityType, entityId, field, [
          'Validation error occurred',
        ])
        return false
      }
    },
    [setValidationError, clearValidationError],
  )

  const getFieldError = useCallback(
    (
      entityType: string,
      entityId: string,
      field: string,
    ): string[] | undefined => {
      return validationErrors?.[entityType]?.[entityId]?.[field]
    },
    [validationErrors],
  )

  const clearFieldError = useCallback(
    (entityType: string, entityId: string, field: string) => {
      clearValidationError(entityType, entityId, field)
    },
    [clearValidationError],
  )

  return {
    validationErrors,
    validateField,
    getFieldError,
    clearFieldError,
  }
}
