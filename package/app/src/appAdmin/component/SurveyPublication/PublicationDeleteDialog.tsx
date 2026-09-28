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

export interface PublicationDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  onConfirm: () => void
  isDeleting: boolean
  includesActivePublication: boolean
}

export const PublicationDeleteDialog: React.FC<
  PublicationDeleteDialogProps
> = ({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isDeleting,
  includesActivePublication,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {includesActivePublication
              ? 'Unpublish and Delete Publications'
              : 'Delete Publications'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {includesActivePublication
              ? `One of the selected publications is currently published. Deleting it will ` +
                `unpublish your survey - participants will no longer be able to respond - ` +
                `and will permanently remove the selected publication record(s) and all ` +
                `related survey responses. This action cannot be undone.`
              : `Are you sure you want to delete ${selectedCount} publication${selectedCount === 1 ? '' : 's'}? This will remove the publication record(s). The related snapshots and survey responses will not be affected. This action cannot be undone.`}
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
