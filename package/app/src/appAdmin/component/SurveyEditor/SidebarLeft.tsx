import React from 'react'

import { cn } from 'common/cn'
import { Sidebar, SidebarContent } from 'component/shadcn/sidebar'
import { SurveyStructurePanel } from 'appAdmin/component/SurveyStructurePanel'

export interface SidebarLeftProps {
  className?: string
}

export const SidebarLeft: React.FC<SidebarLeftProps> = ({ className }) => {
  return (
    <Sidebar
      collapsible="offcanvas"
      side="left"
      className={cn('h-full', className)}
    >
      <SidebarContent id="survey-structure-container">
        <SurveyStructurePanel />
      </SidebarContent>
    </Sidebar>
  )
}
