import React from 'react'
import { CheckCircle2 } from 'lucide-react'

import { Card, CardContent } from 'component/shadcn/card'
import { Separator } from 'component/shadcn/separator'

type Props = {
  children: React.ReactNode
}

export const SurveySuccessCard: React.FC<Props> = ({ children }) => {
  return (
    <div className="animate-in fade-in-50 duration-500">
      <Card className="border-2 border-[var(--alert-success-border)] bg-[var(--alert-success-bg)]">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-6">
            <CheckCircle2
              className="h-20 w-20 text-[var(--alert-success-icon)] mx-auto animate-in zoom-in-50 duration-500"
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
