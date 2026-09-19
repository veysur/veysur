import React from 'react'

import { GoldenCentered } from 'component/GoldenCentered'
import { Card, CardContent } from 'component/shadcn/card'

interface GoldenEmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  message: string
  action?: React.ReactNode
  maxWidth?: string
  topOffset?: string
}

export const GoldenEmptyState: React.FC<GoldenEmptyStateProps> = ({
  icon: Icon,
  title,
  message,
  action,
  maxWidth = 'max-w-2xl',
  topOffset = '11rem',
}) => (
  <GoldenCentered
    style={{ minHeight: `calc(100vh - ${topOffset})` }}
    topOffset={topOffset}
    maxWidth={maxWidth}
  >
    <Card>
      <CardContent className="flex flex-col items-center text-center py-10 px-8">
        <div className="inline-flex items-center justify-center rounded-full bg-muted p-4 mb-4">
          <Icon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{message}</p>
        {action}
      </CardContent>
    </Card>
  </GoldenCentered>
)
