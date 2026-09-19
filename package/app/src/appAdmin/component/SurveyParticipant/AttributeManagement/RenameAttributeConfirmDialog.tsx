import React from 'react'

import { Button } from 'component/shadcn/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'component/shadcn/dialog'

type Props = {
  open: boolean
  renames: Array<{ from: string; to: string }>
  onConfirm: () => void
  onCancel: () => void
}

export const RenameAttributeConfirmDialog: React.FC<Props> = ({
  open,
  renames,
  onConfirm,
  onCancel,
}) => {
  const handleOpenChange = (show: boolean) => {
    if (!show) onCancel()
  }

  const plural = renames.length > 1

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {plural ? 'Rename attributes' : 'Rename attribute'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            Saving will rename {plural ? 'these attributes' : 'this attribute'}{' '}
            and update the stored value for {plural ? 'each of them' : 'it'} on
            every participant in this survey. This cannot be undone.
          </DialogDescription>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {renames.map(({ from, to }) => (
              <li key={from} className="font-mono">
                {from} → {to}
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Rename and Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RenameAttributeConfirmDialog
