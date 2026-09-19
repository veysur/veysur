import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'component/shadcn/alert-dialog'

type StatusType = 'invite' | 'reminder'

const STATUS_CONFIG: Record<StatusType, { title: string; label: string }> = {
  invite: { title: 'Reset Invite Status', label: 'invite' },
  reminder: { title: 'Reset Reminder Status', label: 'reminder' },
}

type ParticipantResetStatusDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: () => Promise<void>
  isResetting: boolean
  statusType: StatusType
}

export const ParticipantResetStatusDialog: React.FC<
  ParticipantResetStatusDialogProps
> = ({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isResetting,
  statusType,
}) => {
  const config = STATUS_CONFIG[statusType]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {`Are you sure you want to reset the ${config.label} status for ${selectedCount} participant${selectedCount === 1 ? '' : 's'}? They will become eligible to receive another ${config.label} email.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isResetting}>
            {isResetting ? 'Resetting...' : 'Reset'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Convenience components for cleaner usage, mirroring SendInvitesDialog/SendRemindersDialog
export const ParticipantResetInviteStatusDialog: React.FC<
  Omit<ParticipantResetStatusDialogProps, 'statusType'>
> = (props) => <ParticipantResetStatusDialog {...props} statusType="invite" />

export const ParticipantResetReminderStatusDialog: React.FC<
  Omit<ParticipantResetStatusDialogProps, 'statusType'>
> = (props) => <ParticipantResetStatusDialog {...props} statusType="reminder" />
