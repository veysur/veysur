import React from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Upload,
  Download,
  TestTube,
  Users,
  Mail,
  Bell,
  Tag,
} from 'lucide-react'

import { Button } from 'component/shadcn/button'
import { ButtonGroup } from 'component/shadcn/button-group'
import { PageHeader } from 'component/PageHeader'

interface ParticipantPageHeaderProps {
  surveyId: string
  hasParticipants: boolean
  onExport: () => void
  isExporting: boolean
  onSendInvites: () => void
  isSendingInvites: boolean
  onSendReminders: () => void
  isSendingReminders: boolean
}

export const ParticipantPageHeader: React.FC<ParticipantPageHeaderProps> = ({
  surveyId,
  hasParticipants,
  onExport,
  isExporting,
  onSendInvites,
  isSendingInvites,
  onSendReminders,
  isSendingReminders,
}) => {
  return (
    <PageHeader
      icon={Users}
      title="Survey Participants"
      description="Manage survey participants. Add, import, or generate participants, and track their survey completion status."
      maxWidth="max-w-none"
      showBack={false}
      inlineNav={
        <ButtonGroup>
          <Button variant="outline" size="sm" tooltip="Add" asChild>
            <Link to={`/survey/${surveyId}/participant/add`}>
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" tooltip="Import" asChild>
            <Link to={`/survey/${surveyId}/participant/import`}>
              <Upload className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" tooltip="Generate" asChild>
            <Link to={`/survey/${surveyId}/participant/generate`}>
              <TestTube className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" tooltip="Attributes" asChild>
            <Link to={`/survey/${surveyId}/participant/attributes`}>
              <Tag className="h-4 w-4" />
            </Link>
          </Button>
          {hasParticipants && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={isExporting}
              tooltip={isExporting ? 'Exporting...' : 'Export'}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {hasParticipants && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendInvites}
              disabled={isSendingInvites}
              tooltip={isSendingInvites ? 'Sending...' : 'Send Invites'}
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
          {hasParticipants && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendReminders}
              disabled={isSendingReminders}
              tooltip={isSendingReminders ? 'Sending...' : 'Send Reminders'}
            >
              <Bell className="h-4 w-4" />
            </Button>
          )}
        </ButtonGroup>
      }
    />
  )
}
