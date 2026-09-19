import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { SurveySnapshotPartial } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { DropdownMenuItem } from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from '@/component/DialogConfirmClickable'

import { useSurveySnapshotDelete } from './hook'

type Props = {
  snapshot: SurveySnapshotPartial
  surveyId: string
}

export const SurveySnapshotActionDropdown: React.FC<Props> = ({
  snapshot,
  surveyId,
}) => {
  const navigate = useNavigate()
  const { surveySnapshotDelete } = useSurveySnapshotDelete(surveyId)

  const deleteAction = async () => {
    await surveySnapshotDelete(snapshot._id)
  }

  const handleEdit = () => {
    navigate(`/survey/${surveyId}/snapshot/${snapshot._id}/edit`)
  }

  const label = snapshot.label ? ' - ' + snapshot.label : ''
  const displayName = `${snapshot._id.slice(-8)}${label}`

  return (
    <ActionMenu title={undefined}>
      <DropdownMenuItem onClick={handleEdit}>
        <Pencil className="h-4 w-4" />
        Edit
      </DropdownMenuItem>
      <DialogConfirmClickable
        as={DropdownMenuItem}
        element={Button}
        title="Delete Snapshot"
        message={
          `Are you sure you want to delete "${displayName}"? ` +
          `This will also delete all responses associated with this snapshot and stop any active publications. ` +
          `This cannot be undone.`
        }
        actionText="Delete"
        confirmAction={deleteAction}
        size="sm"
        className="text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </DialogConfirmClickable>
    </ActionMenu>
  )
}

export default SurveySnapshotActionDropdown
