import React from 'react'
import { CalendarClock } from 'lucide-react'

import { Card, CardContent } from 'component/shadcn/card'
import { Separator } from 'component/shadcn/separator'

type Props = {
  children: React.ReactNode
}

export const SurveyUnavailableCard: React.FC<Props> = ({ children }) => {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <Card className="border-2 border-[var(--alert-info-border)] bg-[var(--alert-info-bg)]">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-6">
            <CalendarClock
              className="h-20 w-20 text-[var(--alert-info-icon)] mx-auto animate-in zoom-in-50 duration-500"
              strokeWidth={1.5}
            />
          </div>

          <Separator className="my-6" />

          {children}
        </CardContent>
      </Card>
    </div>
  )
}
