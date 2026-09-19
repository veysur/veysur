import React from 'react'
import { Trash2 } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { DropdownMenuItem } from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'

type Props = {
  attributeName: string
  onDelete: () => void
}

export const ParticipantAttributeRowAction: React.FC<Props> = ({
  attributeName,
  onDelete,
}) => {
  return (
    <ActionMenu title={undefined}>
      <DialogConfirmClickable
        as={DropdownMenuItem}
        element={Button}
        title="Delete Attribute"
        message={
          `Are you sure you want to delete the "${attributeName}" attribute. ` +
          `This will permanently remove the stored value for this attribute ` +
          `from every participant in this survey. This cannot be undone.`
        }
        actionText="Delete"
        confirmAction={onDelete}
        size="sm"
        className="text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </DialogConfirmClickable>
    </ActionMenu>
  )
}

export default ParticipantAttributeRowAction
