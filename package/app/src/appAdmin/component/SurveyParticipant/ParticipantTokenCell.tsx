import React, { useState } from 'react'
import { SurveyParticipant } from 'veysur-common'
import { Copy, Check } from 'lucide-react'
import { copyToClipboard } from 'common/copyToClipboard'
import { Button } from 'component/shadcn/button'

const COPY_CONFIRMATION_TIMEOUT_MS = 2000

interface ParticipantTokenCellProps {
  participant: SurveyParticipant
  surveyId: string
  disabled?: boolean
}

export const ParticipantTokenCell: React.FC<ParticipantTokenCellProps> = ({
  participant,
  surveyId,
  disabled,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || !participant.token) return
    const langParam = participant.language
      ? `?lang=${encodeURIComponent(participant.language)}`
      : ''
    const url = `${window.location.origin}/survey/${surveyId}/${participant.token}${langParam}`
    if (await copyToClipboard(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), COPY_CONFIRMATION_TIMEOUT_MS)
    }
  }

  if (!participant.token) {
    return <span>-</span>
  }

  return (
    <div className="flex items-center gap-1">
      <span>{participant.token}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-auto w-auto p-1"
        onClick={handleCopyUrl}
        disabled={disabled}
        tooltip={
          disabled
            ? 'Publish the survey to share participant links'
            : 'Copy survey URL with token'
        }
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        ) : (
          <Copy className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    </div>
  )
}
