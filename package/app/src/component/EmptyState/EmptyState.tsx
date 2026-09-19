import React from 'react'
import { Skeleton } from 'component/shadcn/skeleton'

export interface EmptyStateProps {
  /** Whether data is currently loading */
  isLoading: boolean
  /** Custom loading message (optional) */
  loadingMessage?: string
  /** Message to display when empty */
  message: string
  /** Message to display when empty because a filter/search excluded all results */
  filteredMessage?: string
  /** Whether a filter/search is currently active */
  hasFilters?: boolean
}

/**
 * Generic empty state component with consistent styling
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   isLoading={isLoading}
 *   message="No items found."
 * />
 *
 * @example
 * // With a distinct message when a filter/search excludes all results
 * <EmptyState
 *   isLoading={isLoading}
 *   message="No items found."
 *   filteredMessage="No items found matching your filters."
 *   hasFilters={hasFilters}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  isLoading,
  loadingMessage,
  message,
  filteredMessage,
  hasFilters,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {loadingMessage ? (
          <div className="text-center py-5">
            <p className="text-muted-foreground">{loadingMessage}</p>
          </div>
        ) : (
          <>
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-2/5" />
          </>
        )}
      </div>
    )
  }

  const resolvedMessage =
    hasFilters && filteredMessage ? filteredMessage : message

  return (
    <div className="text-center py-5">
      <p className="text-muted-foreground">{resolvedMessage}</p>
    </div>
  )
}
