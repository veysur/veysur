import React from 'react'
import { Upload } from 'lucide-react'

type FileUploadZoneProps = {
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  onDrop,
  onDragOver,
  fileInputRef,
}) => {
  return (
    <div
      className="border-2 border-dashed rounded-lg p-12 text-center mb-4 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={onFileSelect}
        className="hidden"
      />
      <Upload className="mx-auto mb-3 text-muted-foreground" size={48} />
      <p className="mb-1">
        <strong>Click to upload</strong> or drag and drop
      </p>
      <p className="text-muted-foreground text-sm">CSV files only</p>
    </div>
  )
}
