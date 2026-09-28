import React, { useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import { FileUploadOptions } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { Spinner } from 'component/shadcn/spinner'
import { getRestClient } from 'registry'
import {
  uploadSurveyParticipantFile,
  validateFileSize,
  validateFileType,
  formatFileSize,
} from 'common/uploadFile'

import { QuestionTypeProps } from './QuestionTypeProps'

type FileUploadAnswer = { fileIds: string[] }

const DEFAULT_OPTIONS: FileUploadOptions = {
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: [],
  maxFileCount: 1,
}

export const QuestionTypeFileUpload: React.FC<QuestionTypeProps> = ({
  question,
  value,
  onChange,
  authToken,
  ensureResponseStarted,
}) => {
  const options =
    (question?.attributes?.fileUploadOptions as
      | FileUploadOptions
      | undefined) || DEFAULT_OPTIONS
  const answer = (value as FileUploadAnswer | undefined) ?? { fileIds: [] }
  const fileIds = answer.fileIds ?? []

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAddMore = fileIds.length < options.maxFileCount

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !authToken) return

    setError(null)

    const sizeError = validateFileSize(file, options.maxFileSize)
    if (sizeError) {
      setError(sizeError)
      return
    }
    if (options.allowedMimeTypes.length > 0) {
      const typeError = validateFileType(file, options.allowedMimeTypes)
      if (typeError) {
        setError(typeError)
        return
      }
    }

    setUploading(true)
    try {
      await ensureResponseStarted?.()
      const { fileId } = await uploadSurveyParticipantFile(
        getRestClient(),
        file,
        question.code,
        authToken,
      )
      onChange?.({ fileIds: [...fileIds, fileId] })
    } catch {
      setError('File upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (fileId: string) => {
    onChange?.({ fileIds: fileIds.filter((id) => id !== fileId) })
  }

  return (
    <div className="max-w-2xl space-y-2">
      {fileIds.length > 0 && (
        <ul className="space-y-1">
          {fileIds.map((fileId) => (
            <li
              key={fileId}
              className="flex items-center gap-2 text-sm rounded border px-2 py-1"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{fileId}</span>
              <button
                type="button"
                onClick={() => handleRemove(fileId)}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAddMore && (
        <div>
          <Button asChild variant="outline" disabled={uploading}>
            <label className="cursor-pointer">
              {uploading ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Paperclip className="h-4 w-4 mr-2" />
              )}
              Upload file
              <input
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Max {formatFileSize(options.maxFileSize)}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
