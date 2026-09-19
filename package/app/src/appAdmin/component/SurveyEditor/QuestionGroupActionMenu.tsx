import React from 'react'
import { Copy, Pencil } from 'lucide-react'
import { SurveySection } from 'veysur-common'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'component/shadcn/dropdown-menu'
import { ActionMenu } from 'component/ActionMenu'

interface QuestionGroupActionMenuProps {
  group: SurveySection
  onDuplicate?: () => void
  onAddDescription?: () => void
}

export const QuestionGroupActionMenu: React.FC<
  QuestionGroupActionMenuProps
> = ({ group, onDuplicate, onAddDescription }) => {
  return (
    <ActionMenu
      title={undefined}
      className="group-action-menu opacity-50 hover:opacity-100"
    >
      {onAddDescription && !group?.desc && (
        <DropdownMenuItem
          className="flex items-center gap-2 py-1"
          onClick={onAddDescription}
        >
          <Pencil className="h-4 w-4 text-primary" />
          <span>Add Description</span>
        </DropdownMenuItem>
      )}

      {onAddDescription && !group?.desc && onDuplicate && (
        <DropdownMenuSeparator />
      )}

      {onDuplicate && (
        <DropdownMenuItem
          className="flex items-center gap-2 py-1"
          onClick={onDuplicate}
        >
          <Copy className="h-4 w-4 text-primary" />
          <span>Duplicate Group</span>
        </DropdownMenuItem>
      )}
    </ActionMenu>
  )
}
