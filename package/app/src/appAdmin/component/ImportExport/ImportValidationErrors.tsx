import React from 'react'
import { AlertCircle, XCircle, AlertTriangle } from 'lucide-react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { ImportValidationError, ValidationError } from './model'

type ImportValidationErrorsProps = {
  validationError: ImportValidationError
  onRetryWithForce?: () => void
}

export const ImportValidationErrors: React.FC<ImportValidationErrorsProps> = ({
  validationError,
  onRetryWithForce,
}) => {
  const { message, errors, hint } = validationError

  const renderValidationError = (error: ValidationError, index: number) => {
    const isRepairable = error.repairable

    return (
      <div
        key={index}
        className={`p-3 rounded border ${
          isRepairable
            ? 'bg-amber-300/20 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800'
            : 'bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-800'
        }`}
      >
        <div className="flex items-start gap-2">
          {isRepairable ? (
            <AlertTriangle
              size={16}
              className="mt-0.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0"
            />
          ) : (
            <XCircle
              size={16}
              className="mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1">{error.message}</div>
            <div className="text-xs space-y-1">
              {error.entityType && (
                <div className="text-muted-foreground">
                  Entity: <span className="font-mono">{error.entityType}</span>
                </div>
              )}
              {error.entityId && (
                <div className="text-muted-foreground">
                  ID: <span className="font-mono">{error.entityId}</span>
                </div>
              )}
              {error.field && (
                <div className="text-muted-foreground">
                  Field: <span className="font-mono">{error.field}</span>
                </div>
              )}
              {error.details && Object.keys(error.details).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Details
                  </summary>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasRepairableErrors = errors?.some((e) => e.repairable)

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle size={20} />
        <AlertDescription>
          <strong>{message || 'Import validation failed'}</strong>
          {hint && (
            <div className="mt-2 text-sm">
              <strong>Hint:</strong> {hint}
            </div>
          )}
        </AlertDescription>
      </Alert>

      {errors && errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Validation Errors:</h4>
          <div className="space-y-2">
            {errors.map((error, index) => renderValidationError(error, index))}
          </div>
        </div>
      )}

      {hasRepairableErrors && onRetryWithForce && (
        <div className="p-3 border rounded bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800">
          <div className="text-sm">
            <strong>Force mode can repair these issues automatically.</strong>
            <p className="text-muted-foreground mt-1">
              Force mode will attempt to fix validation errors by removing
              invalid references and repairing schema issues.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
