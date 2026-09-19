import React from 'react'
import { SurveyEntity } from 'veysur-common'

import { cn } from 'common/cn'
import { Sidebar, SidebarContent } from 'component/shadcn/sidebar'
import { SurveyAttributesPanel } from 'appAdmin/component/SurveyAttributesPanel'

export interface SidebarRightProps {
  entity: SurveyEntity | undefined
  className?: string
}

export const SidebarRight: React.FC<SidebarRightProps> = ({
  entity,
  className,
}) => {
  return (
    <Sidebar
      collapsible="offcanvas"
      side="right"
      className={cn('h-full', className)}
    >
      <SidebarContent>
        <SurveyAttributesPanel entity={entity} />
      </SidebarContent>
    </Sidebar>
  )
}
