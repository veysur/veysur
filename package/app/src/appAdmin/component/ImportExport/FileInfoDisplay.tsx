import React from 'react'
import { FileText, X } from 'lucide-react'
import { Button } from 'component/shadcn/button'
import { Checkbox } from 'component/shadcn/checkbox'

type ForceModeConfig = {
  enabled: boolean
  onChange: (checked: boolean) => void
  label: string
  description: string
}

type FileInfoDisplayProps = {
  fileName: string
  onClear: () => void
  onImport: () => void
  isLoading: boolean
  importButtonText: string
  forceMode?: ForceModeConfig
  size?: 'sm' | 'default' | 'lg'
}

export const FileInfoDisplay: React.FC<FileInfoDisplayProps> = ({
  fileName,
  onClear,
  onImport,
  isLoading,
  importButtonText,
  forceMode,
  size = 'default',
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

      {forceMode && (
        <div className="flex items-start space-x-2 mb-4 p-3 border rounded bg-muted/20">
          <Checkbox
            id="force-mode"
            checked={forceMode.enabled}
            onCheckedChange={(checked) =>
              forceMode.onChange(checked as boolean)
            }
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="force-mode"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {forceMode.label}
            </label>
            <p className="text-sm text-muted-foreground">
              {forceMode.description}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onImport} disabled={isLoading} size={size}>
          {importButtonText}
        </Button>
      </div>
    </>
  )
}
