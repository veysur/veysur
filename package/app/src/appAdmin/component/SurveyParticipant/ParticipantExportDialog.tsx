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

interface ParticipantExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isExporting: boolean
}

export const ParticipantExportDialog: React.FC<
  ParticipantExportDialogProps
> = ({ open, onOpenChange, onConfirm, isExporting }) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export Participants</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to export all participants?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isExporting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
