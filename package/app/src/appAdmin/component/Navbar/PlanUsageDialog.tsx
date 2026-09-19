import React from 'react'
import { Gauge } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'component/shadcn/dialog'
import { UsageMeter } from 'component/UsageMeter'
import { useFeatureGate } from 'appAdmin/hook'

export const PlanUsageDialog: React.FC = () => {
  const { limits } = useFeatureGate()
  const usersEntry = limits['USERS']
  const responsesEntry = limits['RESPONSES']

  const hasUsageMeters =
    (usersEntry && !usersEntry.unlimited && usersEntry.used != null) ||
    (responsesEntry && !responsesEntry.unlimited && responsesEntry.used != null)

  if (!hasUsageMeters) {
    return null
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          tooltip="Plan Usage"
          className="text-foreground/70 hover:text-primary dark:text-foreground/80 dark:hover:text-primary gap-1.5"
        >
          <Gauge className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">Plan Usage</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan Usage</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 pb-6">
          {usersEntry && !usersEntry.unlimited && usersEntry.used != null && (
            <UsageMeter
              label="Team members"
              used={usersEntry.used}
              limit={usersEntry.limit!}
            />
          )}
          {responsesEntry &&
            !responsesEntry.unlimited &&
            responsesEntry.used != null && (
              <UsageMeter
                label="Responses this billing period"
                used={responsesEntry.used}
                limit={responsesEntry.limit!}
              />
            )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default PlanUsageDialog
