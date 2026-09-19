import { useState, useCallback, useRef } from 'react'

export type FileUploadOptions = {
  acceptedExtensions: string[]
  validateFile?: (file: File) => string | null
}

export type UseFileUploadReturn = {
  selectedFile: File | null
  fileName: string | null
  uploadError: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void
  setUploadError: (error: string | null) => void
  reset: () => void
}

export function useFileUpload(options: FileUploadOptions): UseFileUploadReturn {
  const { acceptedExtensions, validateFile } = options
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFileExtension = useCallback(
    (file: File): boolean => {
      return acceptedExtensions.some((ext) => file.name.endsWith(ext))
    },
    [acceptedExtensions],
  )

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!validateFileExtension(file)) {
        const extensions = acceptedExtensions.join(', ')
        setUploadError(`Please select a valid file (${extensions})`)
        return
      }

      if (validateFile) {
        const error = validateFile(file)
        if (error) {
          setUploadError(error)
          return
        }
      }

      setFileName(file.name)
      setSelectedFile(file)
      setUploadError(null)
    },
    [acceptedExtensions, validateFile, validateFileExtension],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files[0]
      if (file && validateFileExtension(file)) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        if (fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files
          handleFileSelect({
            target: fileInputRef.current,
          } as React.ChangeEvent<HTMLInputElement>)
        }
      }
    },
    [handleFileSelect, validateFileExtension],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
    },
    [],
  )

  const reset = useCallback(() => {
    setSelectedFile(null)
    setFileName(null)
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return {
    selectedFile,
    fileName,
    uploadError,
    fileInputRef,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    setUploadError,
    reset,
  }
}
