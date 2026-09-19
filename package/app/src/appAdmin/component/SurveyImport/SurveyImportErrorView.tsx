import React from 'react'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from 'component/shadcn/button'
import { Alert, AlertDescription } from 'component/shadcn/alert'
import { ImportValidationErrors, ImportValidationError } from '../ImportExport'

type SurveyImportErrorViewProps = {
  error: string
  validationError?: ImportValidationError
  forceMode: boolean
  onReset: () => void
  onRetry: () => void
  onRetryWithForce?: () => void
}

export const SurveyImportErrorView: React.FC<SurveyImportErrorViewProps> = ({
  error,
  validationError,
  forceMode,
  onReset,
  onRetry,
  onRetryWithForce,
}) => {
  return (
    <div className="py-4">
      {validationError && validationError.errors ? (
        <ImportValidationErrors
          validationError={validationError}
          onRetryWithForce={!forceMode ? onRetryWithForce : undefined}
        />
      ) : (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle size={20} />
          <AlertDescription>
            <strong>Import Failed</strong>
            <div className="mt-1 text-sm">{error}</div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 justify-end mt-4">
        <Button onClick={onReset} variant="outline">
          Try Another File
        </Button>
        {validationError && validationError.errors && !forceMode && (
          <Button onClick={onRetryWithForce!}>
            Retry with Force
            <ArrowRight size={16} className="ml-1" />
          </Button>
        )}
        {!validationError?.errors && <Button onClick={onRetry}>Retry</Button>}
      </div>
    </div>
  )
}
