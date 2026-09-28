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

  const renderValidationError = (error: ValidationError, index: number) => (
    <Alert
      key={index}
      variant={error.repairable ? 'warning' : 'destructive'}
      className="py-3"
    >
      {error.repairable ? <AlertTriangle size={16} /> : <XCircle size={16} />}
      <AlertDescription>
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
      </AlertDescription>
    </Alert>
  )

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
        <Alert variant="info" className="py-3">
          <AlertDescription>
            <strong>Force mode can repair these issues automatically.</strong>
            <p className="text-muted-foreground mt-1">
              Force mode will attempt to fix validation errors by removing
              invalid references and repairing schema issues.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
