import React, { useState, useCallback, useEffect } from 'react'
import {
  uploadFile,
  UploadResult,
  formatFileSize,
  formatAllowedFileTypesMessage,
} from 'common/uploadFile'
import { formatDate } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'
import { RestClient } from 'common/RestClient'
import { Button } from 'component/shadcn/button'
import { Card } from 'component/shadcn/card'
import { Progress } from 'component/shadcn/progress'
import { Spinner } from 'component/shadcn/spinner'
import { toast } from 'sonner'

interface SurveyFileManagerProps {
  apiClient: RestClient
  projectId: string
  surveyId: string
  onFileUploaded?: (file: UploadResult['file']) => void
  maxFileSize?: number
  allowedTypes?: string[]
}

interface FileItem {
  _id: string
  filename: string
  size: number
  mimeType: string
  filePath: string
  uploadedAt?: Date
  createdById: string
  bucketType?: string
}

export const SurveyFileManager: React.FC<SurveyFileManagerProps> = ({
  apiClient,
  projectId,
  surveyId,
  onFileUploaded,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes,
}) => {
  const tz = useDisplayTimezone()
  const [files, setFiles] = useState<FileItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load survey files on mount
  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get<{
        files: FileItem[]
        pagination: { total: number }
      }>(`/file/survey/${surveyId}`, {
        headers: { 'X-Project-Id': projectId },
      })
      setFiles(response.files || [])
    } catch (error) {
      console.error('Failed to load survey files:', error)
      toast.error('Failed to load files')
    } finally {
      setIsLoading(false)
    }
  }, [apiClient, projectId, surveyId])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Handle file selection and upload
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Validate file size
    if (selectedFile.size > maxFileSize) {
      toast.error(
        `File size ${formatFileSize(selectedFile.size)} exceeds maximum ${formatFileSize(maxFileSize)}`,
      )
      return
    }

    // Validate file type
    if (allowedTypes && !allowedTypes.includes(selectedFile.type)) {
      toast.error(
        `File type not allowed. ${formatAllowedFileTypesMessage(allowedTypes)}`,
      )
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const result = await uploadFile(apiClient, projectId, selectedFile, {
        surveyId,
        fileContext: 'survey',
        onProgress: (progress) => {
          setUploadProgress(progress.percentage)
        },
      })

      toast.success(
        result.existingFile
          ? 'File already exists (deduplicated)'
          : 'File uploaded successfully',
      )

      // Reload files list
      await loadFiles()

      // Notify parent component
      if (onFileUploaded) {
        onFileUploaded(result.file)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload file',
      )
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      await apiClient.delete(`/file/${fileId}`, {
        headers: { 'X-Project-Id': projectId },
      })

      toast.success('File deleted successfully')
      await loadFiles()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete file')
    }
  }

  // Get file download URL
  const getFileUrl = (file: FileItem): string => {
    const baseUrl = window.location.origin
    const bucketType = file.bucketType || 'public'
    const bucket = bucketType === 'private' ? 'veysur-private' : 'veysur-files'
    return `${baseUrl}/${bucket}/${file.filePath}`
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Survey Files</h3>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept={allowedTypes?.join(',')}
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                {uploadProgress}%
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Maximum file size: {formatFileSize(maxFileSize)}
            {allowedTypes && (
              <>
                <br />
                {formatAllowedFileTypesMessage(allowedTypes)}
              </>
            )}
          </p>
        </div>
      </Card>

      {/* Files List */}
      <Card className="p-4">
        <h4 className="font-semibold mb-4">Uploaded Files</h4>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : files.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No files uploaded yet
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file._id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} • {file.mimeType}
                    {file.uploadedAt && ` • ${formatDate(file.uploadedAt, tz)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getFileUrl(file), '_blank')}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFile(file._id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
