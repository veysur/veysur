import React from 'react'
import { CompletionStatus } from 'veysur-common'

import { Badge } from 'component/shadcn/badge'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

const statusConfig: Record<
  CompletionStatus,
  { text: string; variant: BadgeVariant }
> = {
  notStarted: { text: 'Not started', variant: 'outline' },
  inProgress: { text: 'In progress', variant: 'secondary' },
  completed: { text: 'Completed', variant: 'default' },
}

export const ParticipantStatusBadge: React.FC<{
  status: CompletionStatus
}> = ({ status }) => {
  const config = statusConfig[status]

  return <Badge variant={config.variant}>{config.text}</Badge>
}
