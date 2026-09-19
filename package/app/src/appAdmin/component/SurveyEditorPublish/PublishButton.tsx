import React from 'react'
import { Globe } from 'lucide-react'

import { Button } from 'component/shadcn/button'

type Props = {
  isPublished: boolean
  hasUnpublishedChanges?: boolean
  disabled?: boolean
  onClick: () => void
}

export const PublishButton: React.FC<Props> = ({
  isPublished,
  hasUnpublishedChanges,
  disabled,
  onClick,
}) => {
  const buttonVariant = isPublished ? 'outline' : 'default'
  const label = !isPublished
    ? 'Publish'
    : hasUnpublishedChanges
      ? 'Re-publish'
      : 'Published'
  const tooltip = !isPublished
    ? 'Publish Survey'
    : hasUnpublishedChanges
      ? 'You have unpublished changes'
      : 'Manage publication'

  return (
    <Button
      className="me-0"
      aria-label={tooltip}
      tooltip={tooltip}
      variant={buttonVariant}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="relative">
        <Globe className="h-4 w-4" />
        {isPublished && hasUnpublishedChanges && (
          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber-500" />
        )}
      </span>
      {label}
    </Button>
  )
}
