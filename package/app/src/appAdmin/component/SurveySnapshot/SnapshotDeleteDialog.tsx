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

export interface SnapshotDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: () => void
  isDeleting: boolean
}

export const SnapshotDeleteDialog: React.FC<SnapshotDeleteDialogProps> = ({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isDeleting,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Snapshots</AlertDialogTitle>
          <AlertDialogDescription>
            {`Are you sure you want to delete ${selectedCount} snapshot${selectedCount === 1 ? '' : 's'}? This will permanently delete the snapshot(s), all associated responses, and stop any active publications. This action cannot be undone.`}
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
