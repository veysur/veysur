import React from 'react'

type ImportErrorListProps = {
  errorList: Array<{ row: number; message: string }>
  totalErrors: number
}

export const ImportErrorList: React.FC<ImportErrorListProps> = ({
  errorList,
  totalErrors,
}) => {
  if (errorList.length === 0) return null

  return (
    <div className="mb-4 mt-4">
      <h6 className="font-medium mb-2">Recent Errors:</h6>
      <div
        className="border rounded p-3 overflow-auto"
        style={{ maxHeight: '200px' }}
      >
        {errorList.map((error, index) => (
          <div key={index} className="text-sm text-destructive">
            Row {error.row}: {error.message}
          </div>
        ))}
        {totalErrors > errorList.length && (
          <div className="text-sm text-muted-foreground mt-2">
            ... and {totalErrors - errorList.length} more
          </div>
        )}
      </div>
    </div>
  )
}
