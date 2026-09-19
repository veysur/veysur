import React from 'react'
import { Trash2, Pencil, MailX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SurveyParticipant } from 'veysur-common'

import { Button } from 'component/shadcn/button'
import { DropdownMenuItem } from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { useFlashMessage } from 'component/FlashMessage'

import {
  useSurveyParticipantDelete,
  useSurveyParticipantResetInviteStatusMany,
  useSurveyParticipantResetReminderStatusMany,
} from './hook'

type Props = {
  participant: SurveyParticipant
  surveyId: string
}

export const ParticipantRowAction: React.FC<Props> = ({
  participant,
  surveyId,
}) => {
  const { showFlashMessage } = useFlashMessage()
  const { surveyParticipantDelete } = useSurveyParticipantDelete(surveyId)
  const { surveyParticipantResetInviteStatusMany } =
    useSurveyParticipantResetInviteStatusMany(surveyId)
  const { surveyParticipantResetReminderStatusMany } =
    useSurveyParticipantResetReminderStatusMany(surveyId)

  const deleteAction = async () => {
    await surveyParticipantDelete(participant._id)
    showFlashMessage('success', 'Participant deleted successfully')
  }

  const resetInviteStatusAction = async () => {
    await surveyParticipantResetInviteStatusMany([participant._id])
    showFlashMessage('success', 'Invite status reset')
  }

  const resetReminderStatusAction = async () => {
    await surveyParticipantResetReminderStatusMany([participant._id])
    showFlashMessage('success', 'Reminder status reset')
  }

  const participantName =
    `${participant.nameFirst} ${participant.nameLast}`.trim()
  const displayName = participantName || participant.email

  return (
    <ActionMenu title={undefined}>
      <DropdownMenuItem asChild>
        <Link to={`/survey/${surveyId}/participant/${participant._id}/edit`}>
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      </DropdownMenuItem>
      {participant.inviteSentAt && (
        <DialogConfirmClickable
          as={DropdownMenuItem}
          element={Button}
          title="Reset Invite Status"
          message={
            `Are you sure you want to reset the invite status for "${displayName}"? ` +
            `They will be eligible to receive another invite email.`
          }
          actionText="Reset"
          confirmAction={resetInviteStatusAction}
          size="sm"
        >
          <MailX className="h-4 w-4" />
          Reset Invite Status
        </DialogConfirmClickable>
      )}
      {participant.reminderSentAt && (
        <DialogConfirmClickable
          as={DropdownMenuItem}
          element={Button}
          title="Reset Reminder Status"
          message={
            `Are you sure you want to reset the reminder status for "${displayName}"? ` +
            `They will be eligible to receive another reminder email.`
          }
          actionText="Reset"
          confirmAction={resetReminderStatusAction}
          size="sm"
        >
          <MailX className="h-4 w-4" />
          Reset Reminder Status
        </DialogConfirmClickable>
      )}
      <DialogConfirmClickable
        as={DropdownMenuItem}
        element={Button}
        title="Delete Participant"
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

export default ParticipantRowAction
