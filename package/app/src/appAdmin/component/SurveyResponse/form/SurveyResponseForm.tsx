import React, { useState } from 'react'
import { SurveyResponse } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'component/shadcn/card'
import { Input } from 'component/shadcn/input'
import { Label } from 'component/shadcn/label'
import { Textarea } from 'component/shadcn/textarea'

type Props = {
  title?: string
  response?: SurveyResponse
  onSubmit: (data: Partial<PropsOf<SurveyResponse>>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

export const SurveyResponseForm: React.FC<Props> = ({
  title,
  response,
  onSubmit,
  onCancel,
  isLoading = false,
  error: externalError = null,
}) => {
  const [participantId, setParticipantId] = useState(
    response?.participantId || '',
  )
  const [answers, setAnswers] = useState(
    JSON.stringify(response?.answers || {}, null, 2),
  )
  const [error, setError] = useState<string | null>(null)

  const displayError = externalError || error

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      let parsedAnswers = {}
      if (answers.trim()) {
        parsedAnswers = JSON.parse(answers)
      }

      await onSubmit({
        participantId: participantId || undefined,
        answers: parsedAnswers,
      })
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Invalid JSON format in answers field')
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {displayError && (
        <Alert variant="destructive" className="mb-3 mx-auto max-w-3xl">
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>{title || 'Add/Edit Response'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Label htmlFor="participantId">Participant ID (Optional)</Label>
            <Input
              id="participantId"
              type="text"
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="Enter participant ID"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave empty if this response is not linked to a specific
              participant
            </p>
          </div>

          <div className="mb-3">
            <Label htmlFor="answers">Answers (JSON)</Label>
            <Textarea
              id="answers"
              rows={10}
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              placeholder='{"questionCode": "answer", "anotherQuestion": ["option1", "option2"]}'
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter response data as JSON. Keys should be question codes, values
              depend on question type.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? 'Saving...'
              : response
                ? 'Update Response'
                : 'Create Response'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
