import React from 'react'
import { Paperclip } from 'lucide-react'

export interface ResponseFileSummary {
  _id: string
  filename: string
  url: string
}

type FileUploadAnswerValue = { fileIds?: string[] } | null | undefined

interface FileUploadAnswerSummaryProps {
  answerValue: FileUploadAnswerValue
  files?: ResponseFileSummary[]
}

export const FileUploadAnswerSummary: React.FC<
  FileUploadAnswerSummaryProps
> = ({ answerValue, files = [] }) => {
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
            {file ? (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="text-base text-primary underline underline-offset-2"
              >
                {file.filename}
              </a>
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
