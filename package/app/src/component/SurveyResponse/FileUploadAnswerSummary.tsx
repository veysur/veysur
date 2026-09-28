import React from 'react'
import { Paperclip } from 'lucide-react'

export interface ResponseFileSummary {
  _id: string
  filename: string
}

type FileUploadAnswerValue = { fileIds?: string[] } | null | undefined

interface FileUploadAnswerSummaryProps {
  answerValue: FileUploadAnswerValue
  files?: ResponseFileSummary[]
  /** Fetches a presigned download URL on demand and opens it. Omitted in
   * contexts with no admin-authenticated file API (e.g. print views), where
   * the filename renders as plain text instead of a link. */
  onDownload?: (fileId: string) => void
}

export const FileUploadAnswerSummary: React.FC<
  FileUploadAnswerSummaryProps
> = ({ answerValue, files = [], onDownload }) => {
  const fileIds = answerValue?.fileIds ?? []
  if (fileIds.length === 0) {
    return <div className="text-base text-muted-foreground">No answer</div>
  }

  const fileById = new Map(files.map((file) => [file._id, file]))

  return (
    <ul className="space-y-1">
      {fileIds.map((fileId) => {
        const file = fileById.get(fileId)
        return (
          <li key={fileId} className="flex items-center gap-1">
            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
            {file && onDownload ? (
              <button
                type="button"
                onClick={() => onDownload(fileId)}
                className="text-base text-primary underline underline-offset-2 cursor-pointer"
              >
                {file.filename}
              </button>
            ) : file ? (
              <span className="text-base text-muted-foreground">
                {file.filename}
              </span>
            ) : (
              <span className="text-base text-muted-foreground">
                File unavailable
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
