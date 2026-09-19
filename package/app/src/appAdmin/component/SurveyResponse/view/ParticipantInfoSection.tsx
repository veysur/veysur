import React from 'react'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from 'component/shadcn/accordion'
import { getLanguageName } from 'veysur-common'

import { formatCalendar } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'

interface ParticipantInfoSectionProps {
  participantId?: string | null
  participant?: {
    nameFirst: string
    nameLast: string
    email?: string | null
    language?: string | null
    inviteSentAt?: Date | null
    emailStatus?: string | null
  } | null
}

export const ParticipantInfoSection: React.FC<ParticipantInfoSectionProps> = ({
  participantId,
  participant,
}) => {
  const deleted = participantId != null && !participant
  const tz = useDisplayTimezone()
  return (
    <AccordionItem value="participant" className="border rounded-lg">
      <AccordionTrigger className="px-6 hover:no-underline">
        <h3 className="text-lg font-semibold">
          Participant
          {deleted && (
            <span className="text-muted-foreground text-xs ms-1">
              (deleted)
            </span>
          )}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({tz})
          </span>
        </h3>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Name
            </div>
            <div className="text-base">
              {participant
                ? `${participant.nameFirst} ${participant.nameLast}`
                : deleted
                  ? 'N/A'
                  : 'Anonymous'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Email
            </div>
            <div className="text-base">{participant?.email || 'N/A'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Language
            </div>
            <div className="text-base">
              {participant?.language
                ? getLanguageName(participant.language) || participant.language
                : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Invite Status
            </div>
            <div className="text-base">
              {participant?.inviteSentAt
                ? formatCalendar(participant.inviteSentAt, tz)
                : 'Not Sent'}
            </div>
          </div>
          {participant?.emailStatus && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Email Status
              </div>
              <div className="text-base">{participant.emailStatus}</div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
