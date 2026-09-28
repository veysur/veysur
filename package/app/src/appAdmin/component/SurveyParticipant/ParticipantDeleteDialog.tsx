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

interface ParticipantDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export const ParticipantDeleteDialog: React.FC<
  ParticipantDeleteDialogProps
> = ({ open, onOpenChange, selectedCount, onConfirm, isDeleting }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Participants</AlertDialogTitle>
          <AlertDialogDescription>
            {`Are you sure you want to delete ${selectedCount} participant${selectedCount === 1 ? '' : 's'}? This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
