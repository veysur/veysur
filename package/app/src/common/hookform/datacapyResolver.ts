import { Schema, SchemaValidationResult, SchemaConfig } from '@datacapy/schema'
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'

export interface DatacapyResolverOptions {
  schemaConfig?: SchemaConfig
}

/**
 * Converts @datacapy/schema path-based errors to react-hook-form field errors
 *
 * @param errors - @datacapy/schema errors: { "fieldName": ["error1", "error2"] }
 * @returns react-hook-form errors: { fieldName: { type, message } }
 */
type NestedFieldErrors = {
  [key: string]: NestedFieldErrors | { type: string; message: string }
}

function toFieldErrors<TFieldValues extends FieldValues = FieldValues>(errors: {
  [path: string]: string[]
}): FieldErrors<TFieldValues> {
  const fieldErrors: NestedFieldErrors = {}

  for (const [path, messages] of Object.entries(errors)) {
    if (!messages || messages.length === 0) continue

    // Take the first error message for each field
    const message = messages[0]

    // Handle nested paths (e.g., "address.city" → { address: { city: {...} } })
    const pathParts = path.split('.')

    if (pathParts.length === 1) {
      // Simple top-level field
      fieldErrors[path] = {
        type: 'validation',
        message,
      }
    } else {
      // Nested field - build nested error object
      let current: NestedFieldErrors = fieldErrors

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part] as NestedFieldErrors
      }

      const lastPart = pathParts[pathParts.length - 1]
      current[lastPart] = {
        type: 'validation',
        message,
      }
    }
  }

  return fieldErrors as FieldErrors<TFieldValues>
}

/**
 * Creates a react-hook-form resolver from a @datacapy/schema Schema instance
 *
 * @param schema - The @datacapy/schema Schema to use for validation
 * @returns A resolver function compatible with react-hook-form
 *
 * @example
 * ```typescript
 * import { Schema, sb } from '@datacapy/schema'
 * import { datacapyResolver } from 'common/hookform/datacapyResolver'
 *
 * type LoginFormData = {
 *   email: string
 *   password: string
 * }
 *
 * const loginSchema = new Schema(
 *   sb.object().shape({
 *     email: sb.string().required().email(),
 *     password: sb.string().required()
 *   }).build()
 * )
 *
 * const form = useForm<LoginFormData>({
 *   resolver: datacapyResolver(loginSchema),
 *   defaultValues: { email: '', password: '' }
 * })
 * ```
 */
export function datacapyResolver<TFieldValues extends FieldValues = FieldValues>(
  schema: Schema,
  options?: DatacapyResolverOptions,
): Resolver<TFieldValues> {
  return async (values) => {
    try {
      // Run @datacapy/schema validation (async)
      const result: SchemaValidationResult = await schema.validate(
        values,
        options?.schemaConfig,
      )

      if (result.isValid) {
        // Validation passed
        return {
          values: values as TFieldValues,
          errors: {} as Record<string, never>,
        }
      } else {
        // Validation failed - convert errors to react-hook-form format
        const flatErrors: { [path: string]: string[] } = {}
        for (const path in result.errors) {
          const pathErrors = result.errors[path]
          if (Array.isArray(pathErrors)) {
            flatErrors[path] = pathErrors
          }
        }
        const fieldErrors = toFieldErrors<TFieldValues>(flatErrors)

        return {
          values: {} as Record<string, never>,
          errors: fieldErrors,
        }
      }
    } catch (error) {
      // Handle unexpected errors during validation
      console.error('@datacapy/schema validation error:', error)

      return {
        values: {} as Record<string, never>,
        errors: {
          root: {
            type: 'validation',
            message:
              error instanceof Error ? error.message : 'Validation failed',
          },
        } as FieldErrors<TFieldValues>,
      }
    }
  }
}
