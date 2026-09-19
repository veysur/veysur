import React from 'react'
import { CheckCircle } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { Card, CardContent } from 'component/shadcn/card'
import { cn } from 'common/cn'

export interface SuccessCardProps {
  message: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const SuccessCard: React.FC<SuccessCardProps> = ({
  message,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <Card className={cn('max-w-lg mx-auto', className)}>
      <CardContent className="text-center py-8">
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-success" />
        </div>
        <p className="text-lg mb-4">{message}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
      </CardContent>
    </Card>
  )
}
