import { Schema } from 'mzen-schema'
import { Patch } from 'veysur-common'
import { useCallback, useRef, useEffect } from 'react'

import { useSurveyEditorStore } from '../hook/useSurveyEditorStore'
import { BufferPatches } from '../hook/createSurveyOperations/type'
import { extractFieldErrors } from './extractFieldErrors'

const VALIDATION_DEBOUNCE_MS = 300

export interface ValidateAndBufferConfig {
  patches: Patch[]
  validation?: {
    schema: Schema
    path: string
    value: string
    entityType: string
    entityId: string
    field: string
  }
}

export type ValidateAndBufferFn = (config: ValidateAndBufferConfig) => void

interface UseValidateAndBufferProps {
  bufferPatches: BufferPatches
}

export const useValidateAndBuffer = ({
  bufferPatches,
}: UseValidateAndBufferProps) => {
  const setValidationError = useSurveyEditorStore(
    (state) => state.setValidationError,
  )
  const clearValidationError = useSurveyEditorStore(
    (state) => state.clearValidationError,
  )

  const pendingPatches = useRef<Map<string, Patch[]>>(new Map())
  const timeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const validateAndBuffer = useCallback<ValidateAndBufferFn>(
    (config) => {
      const { patches, validation } = config

      // If no validation config, buffer immediately (for non-validated operations)
      if (!validation) {
        bufferPatches(patches)
        return
      }

      const { schema, path, value, entityType, entityId, field } = validation
      const key = `${entityType}:${entityId}:${field}`

      // Store patches for potential buffering
      pendingPatches.current.set(key, patches)

      // Clear existing timeout for this field
      const existingTimeout = timeouts.current.get(key)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Debounce validation
      const timeout = setTimeout(async () => {
        try {
          // Convert dot notation path to nested object for validation
          const validationData = path
            .split('.')
            .reduceRight<unknown>((acc, part) => ({ [part]: acc }), value)

          const { isValid, errors } = await schema.validatePaths(
            validationData as Record<string, unknown>,
          )

          if (isValid) {
            clearValidationError(entityType, entityId, field)
            const patchesToBuffer = pendingPatches.current.get(key)
            if (patchesToBuffer) {
              bufferPatches(patchesToBuffer)
            }
          } else {
            const fieldErrors = extractFieldErrors(errors, path)
            setValidationError(entityType, entityId, field, fieldErrors)
          }
        } catch (error) {
          console.error('Validation error:', error)
          // On validation error, still buffer patches (fail-open)
          const patchesToBuffer = pendingPatches.current.get(key)
          if (patchesToBuffer) {
            bufferPatches(patchesToBuffer)
          }
        } finally {
          pendingPatches.current.delete(key)
          timeouts.current.delete(key)
        }
      }, VALIDATION_DEBOUNCE_MS)

      timeouts.current.set(key, timeout)
    },
    [bufferPatches, setValidationError, clearValidationError],
  )

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    timeouts.current.forEach((timeout) => clearTimeout(timeout))
    timeouts.current.clear()
    pendingPatches.current.clear()
  }, [])

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return { validateAndBuffer, cleanup }
}
