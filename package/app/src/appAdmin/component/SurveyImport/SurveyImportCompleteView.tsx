import React from 'react'
import { Button } from 'component/shadcn/button'
import { StatusAlert } from 'component/StatusAlert'
import { ProcessImportResponse } from '../ImportExport/model'

type SurveyImportCompleteViewProps = {
  result: ProcessImportResponse
  onReset: () => void
  onViewSurveys: () => void
}

export const SurveyImportCompleteView: React.FC<
  SurveyImportCompleteViewProps
> = ({ result, onReset, onViewSurveys }) => {
  return (
    <div className="py-4">
      <StatusAlert variant="success" className="mb-4">
        <strong>Survey imported successfully!</strong>
        <div className="mt-1 text-sm">Survey ID: {result.entityId}</div>
      </StatusAlert>

      <div className="space-y-4 mb-4">
        {result.hasIdTranslations && (
          <StatusAlert variant="info" className="mb-4">
            <strong>IDs were automatically adjusted</strong>
            <div className="mt-1 text-sm text-muted-foreground">
              Some entities already existed with the same IDs, so new IDs were
              generated to avoid conflicts. The survey was imported successfully
              with the new ID: {result.entityId}
            </div>
          </StatusAlert>
        )}

        {result.repairs && result.repairs.length > 0 && (
          <StatusAlert variant="warning" showIcon={false}>
            <h4 className="font-medium mb-2">Repairs Made</h4>
            <p className="text-sm mb-3">
              The following repairs were automatically applied:
            </p>
            <ul className="space-y-2">
              {result.repairs.map(
                (
                  r: {
                    type: string
                    entity: string
                    id: string
                    reason: string
                  },
                  idx: number,
                ) => (
                  <li key={idx} className="text-sm">
                    <strong>{r.type}</strong> on {r.entity} (ID: {r.id})
                    <div className="text-muted-foreground text-xs">
                      Reason: {r.reason}
                    </div>
                  </li>
                ),
              )}
            </ul>
          </StatusAlert>
        )}

        {result.warnings && result.warnings.length > 0 && (
          <StatusAlert variant="warning" showIcon={false}>
            <h4 className="font-medium mb-2">Warnings</h4>
            <ul className="space-y-1">
              {result.warnings.map((w: { message: string }, idx: number) => (
                <li key={idx} className="text-sm">
                  {w.message}
                </li>
              ))}
            </ul>
          </StatusAlert>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <Button onClick={onReset} variant="outline">
          Import Another
        </Button>
        <Button onClick={onViewSurveys}>View Surveys</Button>
      </div>
    </div>
  )
}
