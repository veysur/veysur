import React from 'react'
import { Lock } from 'lucide-react'

import { Alert, AlertDescription } from 'component/shadcn/alert'
import { Button } from 'component/shadcn/button'
import { AuthDomain } from 'model/service/AuthDomain/AuthDomain'
import { cn } from 'common/cn'

type Props = {
  message: string
  className?: string
}

export const PlanGateAlert: React.FC<Props> = ({ message, className }) => {
  const upgradeUrl = AuthDomain.getAccountUrl()

  return (
    <Alert className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
        <AlertDescription>{message}</AlertDescription>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => (window.location.href = upgradeUrl)}
      >
        Upgrade
      </Button>
    </Alert>
  )
}
