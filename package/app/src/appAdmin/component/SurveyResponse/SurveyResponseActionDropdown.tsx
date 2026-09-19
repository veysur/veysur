import React from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SurveyResponse } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { DropdownMenuItem } from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from '@/component/DialogConfirmClickable'
import { useFlashMessage } from 'component/FlashMessage'

import { useSurveyResponseDelete } from './hook'

type Props = {
  response: SurveyResponse
  surveyId: string
  snapshotId: string
}

export const SurveyResponseActionDropdown: React.FC<Props> = ({
  response,
  surveyId,
  snapshotId,
}) => {
  const { showFlashMessage } = useFlashMessage()
  const { surveyResponseDelete } = useSurveyResponseDelete(
    surveyId,
    snapshotId,
    response.publicationId,
  )

  const deleteAction = async () => {
    await surveyResponseDelete(response._id)
    showFlashMessage('success', 'Response deleted successfully')
  }

  const displayName = `Response ${response._id.slice(-8)}`

  return (
    <ActionMenu title={undefined}>
      <DropdownMenuItem asChild>
        <Link to={`/survey/${surveyId}/response/${response._id}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </DropdownMenuItem>

      <DialogConfirmClickable
        as={DropdownMenuItem}
        element={Button}
        title="Delete Response"
        message={
          `Are you sure you want to delete "${displayName}". ` +
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

export default SurveyResponseActionDropdown
