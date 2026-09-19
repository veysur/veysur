import { useMemo } from 'react'
import { SurveyParticipant, Iso639v1 } from 'veysur-common'
import type { ColumnDefinition } from 'component/DataTable'

import { formatCalendar } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'
import { ParticipantTokenCell } from '../ParticipantTokenCell'
import { ParticipantRowAction } from '../ParticipantRowAction'
import { ParticipantStatusBadge } from '../ParticipantStatusBadge'
import { getParticipantSendStatus } from './getParticipantSendStatus'

export const useParticipantTableColumns = (
  surveyId: string,
  isPublished: boolean,
): ColumnDefinition<SurveyParticipant>[] => {
  const tz = useDisplayTimezone()
  return useMemo(
    () => [
      {
        key: 'name',
        title: 'Name',
        render: (participant) =>
          `${participant.nameFirst} ${participant.nameLast}`,
      },
      {
        key: 'email',
        title: 'Email',
        render: (participant) => participant.email,
      },
      {
        key: 'emailStatus',
        title: 'Email Status',
        render: (participant) => participant.emailStatus,
        className: 'capitalize',
      },
      {
        key: 'sendStatus',
        title: 'Send Status',
        render: (participant) => getParticipantSendStatus(participant),
      },
      {
        key: 'completionStatus',
        title: 'Status',
        render: (participant) => (
          <ParticipantStatusBadge status={participant.completionStatus} />
        ),
      },
      {
        key: 'inviteSent',
        title: 'Invite Sent',
        render: (participant) => {
          if (participant.inviteSentAt)
            return formatCalendar(participant.inviteSentAt, tz)
          return participant.inviteQueuedAt ? 'Queued' : 'No'
        },
      },
      {
        key: 'reminderSent',
        title: 'Reminder Sent',
        render: (participant) => {
          if (participant.reminderSentAt)
            return formatCalendar(participant.reminderSentAt, tz)
          return participant.reminderQueuedAt ? 'Queued' : 'No'
        },
      },
      {
        key: 'language',
        title: 'Language',
        render: (participant) => {
          const key = participant.language as keyof typeof Iso639v1
          return Iso639v1[key]?.name || key
        },
      },
      {
        key: 'token',
        title: 'Token',
        render: (participant) => (
          <ParticipantTokenCell
            participant={participant}
            surveyId={surveyId}
            disabled={!isPublished}
          />
        ),
      },
      {
        key: 'created',
        title: 'Created',
        render: (participant) => formatCalendar(participant.createdAt, tz),
      },
      {
        key: 'actions',
        title: '',
        render: (participant) => (
          <ParticipantRowAction participant={participant} surveyId={surveyId} />
        ),
        className: 'action-menu text-end',
      },
    ],
    [surveyId, isPublished, tz],
  )
}
