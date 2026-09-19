import React, { useMemo } from 'react'
import { ProjectAdmin } from 'veysur-common'

import { formatDateLong } from 'common'
import { useDisplayTimezone } from 'appAdmin/hook'
import { DataTable } from 'component/DataTable'
import type { ColumnDefinition } from 'component/DataTable'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { Button } from 'component/shadcn/button'

type Props = {
  invites: ProjectAdmin[]
  isLoading: boolean
  emptyMessage: string
  showCancel?: boolean
  onCancel?: (projectAdminId: string) => Promise<void>
}

export const TeamInviteList: React.FC<Props> = ({
  invites,
  isLoading,
  emptyMessage,
  showCancel = false,
  onCancel,
}) => {
  const tz = useDisplayTimezone()
  const columns = useMemo((): ColumnDefinition<ProjectAdmin>[] => {
    const base: ColumnDefinition<ProjectAdmin>[] = [
      {
        key: 'name',
        title: 'Name',
        render: (invite) => {
          const name =
            (invite.nameFirst || '') +
            (invite.nameLast ? ' ' + invite.nameLast : '')
          return name || '—'
        },
      },
      {
        key: 'email',
        title: 'Email',
        render: (invite) => invite.email ?? '—',
      },
      {
        key: 'sent',
        title: 'Sent',
        render: (invite) =>
          invite.createdAt ? formatDateLong(invite.createdAt, tz) : '—',
      },
    ]

    if (showCancel && onCancel) {
      base.push({
        key: 'actions',
        title: '',
        className: 'text-right',
        render: (invite) => (
          <DialogConfirmClickable
            as={Button}
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            title="Cancel Invitation"
            message={`Are you sure you want to cancel the invitation for ${invite.email}?`}
            actionText="Cancel Invitation"
            confirmAction={() => onCancel(invite._id)}
          >
            Cancel
          </DialogConfirmClickable>
        ),
      })
    }

    return base
  }, [showCancel, onCancel, tz])

  return (
    <DataTable
      data={invites}
      columns={columns}
      getRowId={(invite) => invite._id}
      clickableRows={false}
      isLoading={isLoading}
      emptyState={
        <div className="p-6 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      }
    />
  )
}
