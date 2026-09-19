import React from 'react'
import { Skeleton } from 'component/shadcn/skeleton'

export interface ResponseEmptyStateProps {
  isLoading: boolean
  hasResponses: boolean
  hasSnapshot: boolean
}

export const ResponseEmptyState: React.FC<ResponseEmptyStateProps> = ({
  isLoading,
  hasResponses,
  hasSnapshot,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-2/5" />
      </div>
    )
  }

  if (!hasResponses) {
    return (
      <div className="text-center py-5">
        <p className="text-muted-foreground">
          {!hasSnapshot
            ? 'Survey was not published yet.'
            : 'No responses found.'}
        </p>
      </div>
    )
  }

  return null
}
