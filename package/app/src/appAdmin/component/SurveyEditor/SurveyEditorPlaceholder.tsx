import React from 'react'

import { Skeleton } from 'component/shadcn/skeleton'

export const SurveyEditorPlaceholder: React.FC = () => {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={`content-placeholder-${i}`} className="my-3 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </>
  )
}
