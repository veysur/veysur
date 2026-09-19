import React from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { cn } from 'common/cn'

type Props = {
  surveyId: string
  className?: string
  publishAction?: React.ReactNode
}

export const SurveyNotPublishedAlert: React.FC<Props> = ({
  surveyId,
  className,
  publishAction,
}) => {
  return (
    <Alert
      variant="warning"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 shrink-0" />
        <AlertDescription>
          This survey isn&apos;t published yet. Participant links won&apos;t
          work until the survey is published.
        </AlertDescription>
      </div>
      {publishAction ?? (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/survey/${surveyId}/edit`}>Publish</Link>
        </Button>
      )}
    </Alert>
  )
}
