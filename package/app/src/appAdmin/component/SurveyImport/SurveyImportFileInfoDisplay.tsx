import React from 'react'
import { FileText, X } from 'lucide-react'
import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'

type SurveyImportFileInfoDisplayProps = {
  fileName: string
  forceMode: boolean
  onForceModeChange: (checked: boolean) => void
  onClear: () => void
  onImport: () => void
  isLoading: boolean
}

export const SurveyImportFileInfoDisplay: React.FC<
  SurveyImportFileInfoDisplayProps
> = ({
  fileName,
  forceMode,
  onForceModeChange,
  onClear,
  onImport,
  isLoading,
}) => {
  return (
    <>
      <div className="flex items-center mb-4 p-3 border rounded">
        <FileText size={20} className="mr-2 text-primary" />
        <span className="flex-1">{fileName}</span>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X size={16} />
        </Button>
      </div>

      <div className="flex items-start space-x-2 mb-4 p-3 border rounded bg-muted/20">
        <Checkbox
          id="force-mode"
          checked={forceMode}
          onCheckedChange={(checked) => onForceModeChange(checked as boolean)}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="force-mode"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Enable force mode
          </label>
          <p className="text-sm text-muted-foreground">
            Automatically repair validation errors by removing invalid
            references and fixing schema issues.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onImport} disabled={isLoading} size="lg">
          Import Survey
        </Button>
      </div>
    </>
  )
}
