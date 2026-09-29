import type { Schema, SchemaPaths } from '@datacapy/schema'
import { useCallback, useRef } from 'react'

import { useSurveyEditorStore } from '../hook/useSurveyEditorStore'

const VALIDATION_DEBOUNCE_MS = 300

export function useDebouncedValidation() {
  const setValidationError = useSurveyEditorStore(
    (state) => state.setValidationError,
  )
  const clearValidationError = useSurveyEditorStore(
    (state) => state.clearValidationError,
  )

  // Store timeout refs for each field to enable per-field debouncing
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const debouncedValidateField = useCallback(
    (
      schema: Schema,
      path: string,
      value: unknown,
      entityType: string,
      entityId: string,
      field: string,
    ) => {
      // Create unique key for this field
      const key = `${entityType}:${entityId}:${field}`

      // Clear existing timeout for this field
      const existingTimeout = timeoutRefs.current.get(key)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        try {
          // Convert dot notation path to nested object for L10n validation
          // e.g., 'title.eng' -> { title: { en: value } }
          const pathParts = path.split('.')
          let validationData: SchemaPaths

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
          } else {
            // Extract errors from nested structure
            const firstKey = pathParts[0] as string
            const secondKey = pathParts[1] as string
            const directErrors = errors?.[path]
            const nested = errors?.[firstKey]
            const nestedErrors =
              firstKey && secondKey && nested && !Array.isArray(nested)
                ? nested[secondKey]
                : undefined

            let fieldErrors: string[] = Array.isArray(directErrors)
              ? directErrors
              : (nestedErrors ?? ['Validation failed'])

            // Remove duplicates
            fieldErrors = [...new Set(fieldErrors)]

            setValidationError(entityType, entityId, field, fieldErrors)
          }
        } catch (error) {
          console.error('Validation error:', error)
          setValidationError(entityType, entityId, field, [
            'Validation error occurred',
          ])
        } finally {
          timeoutRefs.current.delete(key)
        }
      }, VALIDATION_DEBOUNCE_MS)

      timeoutRefs.current.set(key, timeout)
    },
    [setValidationError, clearValidationError],
  )

  return { debouncedValidateField }
}
