import React, { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'

import { cn } from 'common/cn'
import { Button } from 'component/shadcn/button'
import { Progress } from 'component/shadcn/progress'
import { IMAGE_CONFIG } from 'common/imageProcessing'

export interface ImageUploadDropZoneProps {
  onFileSelect: (file: File) => void
  isUploading?: boolean
  uploadProgress?: number
  disabled?: boolean
  maxFileSize?: number
  allowedTypes?: string[]
  compact?: boolean
}

export const ImageUploadDropZone: React.FC<ImageUploadDropZoneProps> = ({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  disabled = false,
  maxFileSize = IMAGE_CONFIG.MAX_FILE_SIZE,
  allowedTypes = IMAGE_CONFIG.ALLOWED_TYPES,
  compact = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileValidation = useCallback(
    (file: File): boolean => {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setError('Please select an image file (PNG, JPEG, or WebP)')
        return false
      }

      // Validate file size
      if (file.size > maxFileSize) {
        const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1)
        setError(`Image exceeds maximum file size (${maxSizeMB}MB)`)
        return false
      }

      setError(null)
      return true
    },
    [allowedTypes, maxFileSize],
  )

  const handleFileSelection = useCallback(
    (file: File) => {
      if (handleFileValidation(file)) {
        onFileSelect(file)
      }
    },
    [handleFileValidation, onFileSelect],
  )

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        handleFileSelection(file)
      }
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFileSelection],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)

      if (disabled || isUploading) return

      const file = event.dataTransfer.files?.[0]
      if (file) {
        handleFileSelection(file)
      }
    },
    [disabled, isUploading, handleFileSelection],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (!disabled && !isUploading) {
        setIsDragging(true)
      }
    },
    [disabled, isUploading],
  )

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
    },
    [],
  )

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div
      className={cn('w-full h-full flex flex-col items-center justify-center', {
        'cursor-pointer': !isDragging && !disabled && !isUploading,
        'bg-muted opacity-50 cursor-not-allowed': disabled || isUploading,
        'opacity-70': true,
      })}
      onClick={disabled || isUploading ? undefined : handleButtonClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex flex-col items-center justify-center gap-2 h-full">
        <Upload
          className={cn(
            compact ? 'h-6 w-6' : 'h-10 w-10',
            'text-muted-foreground',
            { 'text-primary': isDragging },
          )}
        />
        {compact ? (
          <p className="text-xs font-medium text-center">
            {isUploading
              ? 'Uploading...'
              : isDragging
                ? 'Drop here'
                : 'Upload image'}
          </p>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium mb-1">
              {isUploading
                ? 'Uploading...'
                : isDragging
                  ? 'Drop image here'
                  : 'Drag and drop an image'}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, or WebP (max {(maxFileSize / (1024 * 1024)).toFixed(0)}
              MB)
            </p>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            handleButtonClick()
          }}
          disabled={disabled || isUploading}
        >
          {compact ? 'Select' : 'Select Image'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
          data-testid="image-upload-input"
        />
      </div>

      {isUploading && (
        <div className="mt-2">
          <Progress value={uploadProgress} className="h-2" />
          {!compact && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {uploadProgress}% complete
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2">
          <p className="text-xs text-destructive text-center">{error}</p>
        </div>
      )}
    </div>
  )
}
