import React from 'react'
import { Button } from 'component/shadcn/button'
import { StatusAlert } from 'component/StatusAlert'
import { ImportErrorList } from './ImportErrorList'

type ImportCompleteViewProps = {
  imported: number
  errors: number
  errorList: Array<{ row: number; message: string }>
  onReset: () => void
}

export const ImportCompleteView: React.FC<ImportCompleteViewProps> = ({
  imported,
  errors,
  errorList,
  onReset,
}) => {
  return (
    <div className="py-4">
      <StatusAlert variant={errors > 0 ? 'warning' : 'success'}>
        <strong>
          Successfully imported {imported} participant
          {imported !== 1 ? 's' : ''}
        </strong>
        {errors > 0 && (
          <span className="ml-2">
            ({errors} error
            {errors !== 1 ? 's' : ''})
          </span>
        )}
      </StatusAlert>

      <ImportErrorList errorList={errorList} totalErrors={errors} />

      <Button onClick={onReset} className="mt-4">
        Import More
      </Button>
    </div>
  )
}
