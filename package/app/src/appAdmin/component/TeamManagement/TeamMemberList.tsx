import React, { useMemo } from 'react'
import { Crown, User } from 'lucide-react'
import { ProjectAdmin } from 'veysur-common'

import { Badge } from 'component/shadcn/badge'
import { DataTable } from 'component/DataTable'
import type { ColumnDefinition } from 'component/DataTable'
import { DialogConfirmClickable } from 'component/DialogConfirmClickable'
import { Button } from 'component/shadcn/button'

type OwnerRow = {
  _id: string
  nameFirst: string
  nameLast: string
  email: string
}

type MemberRow = {
  _id: string
  name: string
  email: string
  isOwner: boolean
  memberId?: string
}

type Props = {
  owner: OwnerRow
  activeMembers: ProjectAdmin[]
  isLoading: boolean
  onDeleteMember: (projectAdminId: string) => Promise<void>
}

export const TeamMemberList: React.FC<Props> = ({
  owner,
  activeMembers,
  isLoading,
  onDeleteMember,
}) => {
  const ownerName =
    owner.nameFirst + (owner.nameLast ? ' ' + owner.nameLast : '')

  const rows: MemberRow[] = [
    { _id: owner._id, name: ownerName, email: owner.email, isOwner: true },
    ...activeMembers.map((m) => ({
      _id: m._id,
      name: m.user
        ? (m.user.nameFirst || '') +
          (m.user.nameLast ? ' ' + m.user.nameLast : '')
        : '—',
      email: m.user?.email ?? '—',
      isOwner: false,
      memberId: m._id,
    })),
  ]

  const columns = useMemo(
    (): ColumnDefinition<MemberRow>[] => [
      {
        key: 'name',
        title: 'Name',
        render: (row) => (
          <div className="flex items-center gap-2">
            {row.isOwner ? (
              <Crown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            {row.name}
          </div>
        ),
      },
      {
        key: 'email',
        title: 'Email',
        render: (row) => row.email,
      },
      {
        key: 'role',
        title: 'Role',
        render: (row) =>
          row.isOwner ? (
            <Badge variant="default">Owner</Badge>
          ) : (
            <Badge variant="secondary">Admin</Badge>
          ),
      },
      {
        key: 'actions',
        title: '',
        className: 'text-right',
        render: (row) =>
          row.isOwner || !row.memberId ? null : (
            <DialogConfirmClickable
              as={Button}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              title="Remove Team Member"
              message={`Are you sure you want to remove ${row.name} from the team?`}
              actionText="Remove"
              confirmAction={() => onDeleteMember(row.memberId!)}
            >
              Remove
            </DialogConfirmClickable>
          ),
      },
    ],
    [onDeleteMember],
  )

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row._id}
      clickableRows={false}
      isLoading={isLoading}
    />
  )
}
