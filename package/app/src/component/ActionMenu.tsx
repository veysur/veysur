import React, { ReactNode, createContext, useContext, useState } from 'react'
import { MoreVertical } from 'lucide-react'

import { Button } from 'component/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from 'component/shadcn/dropdown-menu'
import { cn } from 'common/cn'

interface ActionMenuProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  variant?: React.ComponentProps<typeof Button>['variant']
}

interface ActionMenuContextType {
  closeMenu: () => void
}

const ActionMenuContext = createContext<ActionMenuContextType | null>(null)

export const useActionMenu = () => {
  const context = useContext(ActionMenuContext)
  return context
}

export const ActionMenu: React.FC<ActionMenuProps> = (props) => {
  const [open, setOpen] = useState(false)

  const closeMenu = () => setOpen(false)

  return (
    <ActionMenuContext.Provider value={{ closeMenu }}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant={props.variant || 'link'}
            size="icon-sm"
            className={cn('action-menu cursor-pointer', props.className)}
          >
            {props.title || <MoreVertical className="h-3 w-3" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{props.children}</DropdownMenuContent>
      </DropdownMenu>
    </ActionMenuContext.Provider>
  )
}
