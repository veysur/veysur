import React from 'react'
import { FileText, X } from 'lucide-react'
import { Button } from 'component/shadcn/button'

type FileInfoDisplayProps = {
  fileName: string
  onClear: () => void
  onImport: () => void
  isLoading: boolean
}

export const FileInfoDisplay: React.FC<FileInfoDisplayProps> = ({
  fileName,
  onClear,
  onImport,
  isLoading,
}) => {
  return (
    <>
      <div className="flex items-center mb-3">
        <FileText size={20} className="mr-2 text-primary" />
        <span className="mr-3">{fileName}</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-destructive"
          onClick={onClear}
        >
          <X size={16} /> Clear
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={onImport} disabled={isLoading}>
          Import Participants
        </Button>
      </div>
    </>
  )
}
